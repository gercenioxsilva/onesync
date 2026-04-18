import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.core.database import SessionLocal
from app.slices.ai.application.services import AIProcessingService
from app.slices.ai.infrastructure.models import AIProcessingLogModel

logger = logging.getLogger(__name__)

scheduler: BackgroundScheduler | None = None


def init_scheduler() -> BackgroundScheduler:
    global scheduler

    if scheduler is not None:
        return scheduler

    scheduler = BackgroundScheduler()

    scheduler.add_job(
        retry_failed_processing,
        IntervalTrigger(minutes=5),
        id="retry_failed_processing",
        name="Retry failed AI processing",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )

    logger.info("Task scheduler initialized")
    return scheduler


def get_scheduler() -> BackgroundScheduler:
    global scheduler
    if scheduler is None:
        init_scheduler()
    return scheduler


def start_scheduler() -> None:
    scheduler = get_scheduler()
    if not scheduler.running:
        scheduler.start()
        logger.info("Task scheduler started")


def stop_scheduler() -> None:
    global scheduler
    if scheduler is not None and scheduler.running:
        scheduler.shutdown()
        scheduler = None
        logger.info("Task scheduler stopped")


def retry_failed_processing() -> None:
    db = SessionLocal()
    try:
        failed_logs = db.execute(
            select(AIProcessingLogModel)
            .where(
                AIProcessingLogModel.status == "failed",
                AIProcessingLogModel.retry_count < 3,
            )
            .order_by(AIProcessingLogModel.created_at.desc())
            .limit(10)
        ).scalars().all()

        if not failed_logs:
            return

        logger.info(f"Found {len(failed_logs)} failed processing tasks to retry")

        service = AIProcessingService(db)

        for log in failed_logs:
            try:
                from app.slices.one_on_ones.infrastructure.models import OneOnOneModel

                one_on_one = db.execute(
                    select(OneOnOneModel).where(OneOnOneModel.id == log.one_on_one_id)
                ).scalar_one_or_none()

                if not one_on_one:
                    log.status = "failed"
                    log.error_message = "1:1 meeting not found"
                    continue

                transcription = one_on_one.summary or log.input_source or ""

                if not transcription or len(transcription) < 10:
                    logger.warning(f"Skipping retry for {log.id}: no valid transcription")
                    continue

                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                loop.run_until_complete(
                    service.process_one_on_one(
                        tenant_id=log.tenant_id,
                        one_on_one_id=log.one_on_one_id,
                        transcription=transcription,
                        user_id=log.processed_by_user_id,
                        input_type=log.input_type,
                    )
                )

                logger.info(f"Successfully retried processing for log {log.id}")

            except Exception as e:
                logger.error(f"Error retrying processing for log {log.id}: {str(e)}")
                log.retry_count += 1
                log.error_message = str(e)

    except Exception as e:
        logger.error(f"Error in retry_failed_processing job: {str(e)}")

    finally:
        db.close()


def schedule_one_on_one_processing(
    tenant_id: str,
    one_on_one_id: str,
    transcription: str,
    user_id: str | None = None,
    input_type: str = "transcription",
    delay_seconds: int = 0,
) -> str:
    scheduler = get_scheduler()

    def process_job() -> None:
        db = SessionLocal()
        try:
            service = AIProcessingService(db)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            loop.run_until_complete(
                service.process_one_on_one(
                    tenant_id=tenant_id,
                    one_on_one_id=one_on_one_id,
                    transcription=transcription,
                    user_id=user_id,
                    input_type=input_type,
                )
            )

            logger.info(f"Scheduled processing completed for 1:1 {one_on_one_id}")

        except Exception as e:
            logger.error(f"Error in scheduled processing for 1:1 {one_on_one_id}: {str(e)}")

        finally:
            db.close()

    job_id = f"{tenant_id}_{one_on_one_id}_{delay_seconds}"

    scheduler.add_job(
        process_job,
        "date",
        id=job_id,
        replace_existing=True,
        args=[],
    )

    logger.info(f"Scheduled processing for 1:1 {one_on_one_id} with job_id {job_id}")
    return job_id
