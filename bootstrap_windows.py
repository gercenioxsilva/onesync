#!/usr/bin/env python3
import shutil
import subprocess
import sys


TOOLS = {
    "py": {
        "label": "Python Launcher (py)",
        "winget_id": None,
        "required": True,
    },
    "npm": {
        "label": "Node.js / npm",
        "winget_id": "OpenJS.NodeJS.LTS",
        "required": False,
    },
    "docker": {
        "label": "Docker Desktop",
        "winget_id": "Docker.DockerDesktop",
        "required": False,
    },
}


def command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def winget_exists() -> bool:
    return command_exists("winget")


def install_with_winget(package_id: str) -> int:
    command = [
        "winget",
        "install",
        "--id",
        package_id,
        "-e",
        "--accept-source-agreements",
        "--accept-package-agreements",
    ]
    print(f"\nInstalando {package_id} via winget...")
    result = subprocess.run(command, check=False)
    return result.returncode


def ask_yes_no(message: str) -> bool:
    answer = input(f"{message} [s/N]: ").strip().lower()
    return answer in {"s", "sim", "y", "yes"}


def main() -> int:
    print("\n=== Bootstrap Ambiente Local (Windows) ===\n")

    missing = []
    for tool, config in TOOLS.items():
        exists = command_exists(tool)
        status = "OK" if exists else "AUSENTE"
        print(f"- {config['label']}: {status}")
        if not exists:
            missing.append((tool, config))

    if not missing:
        print("\nTudo pronto no ambiente local.")
        print("Você já pode executar: python launcher.py")
        return 0

    if not winget_exists():
        print("\nwinget não encontrado. Instale manualmente Node.js e Docker Desktop.")
        return 1

    for tool, config in missing:
        if config["winget_id"] is None:
            if config["required"]:
                print("\nPython Launcher (py) não encontrado. Instale Python 3.12+ e marque 'Add to PATH'.")
            continue

        if ask_yes_no(f"Deseja instalar {config['label']} agora?"):
            code = install_with_winget(config["winget_id"])
            if code != 0:
                print(f"Falha ao instalar {config['label']} (código {code}).")
            else:
                print(f"{config['label']} instalado. Reinicie o terminal para atualizar PATH.")

    print("\nBootstrap finalizado.")
    print("Próximo passo: feche/reabra o PowerShell e execute `python launcher.py` ou `docker compose up --build`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
