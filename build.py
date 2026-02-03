#!/usr/bin/env python3
"""
Build script for Analog Clock application (Windows only).
Creates a standalone executable for Windows.
"""

import subprocess
import sys
import os
import shutil


def build():
    """Build the application using PyInstaller."""
    # Check platform
    if sys.platform != 'win32':
        print("Warning: This application is designed for Windows.")
        print("The transparent background feature requires Windows.")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            print("Build cancelled.")
            sys.exit(0)

    # Ensure PyInstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])

    # Get the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    main_script = os.path.join(script_dir, 'analog_clock.py')

    # Clean previous builds
    dist_dir = os.path.join(script_dir, 'dist')
    build_dir = os.path.join(script_dir, 'build')
    spec_file = os.path.join(script_dir, 'AnalogClock.spec')

    for path in [dist_dir, build_dir]:
        if os.path.exists(path):
            shutil.rmtree(path)
    if os.path.exists(spec_file):
        os.remove(spec_file)

    # Build command for Windows
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',
        '--noconsole',
        '--name', 'AnalogClock',
        main_script
    ]

    print("Building Analog Clock for Windows...")
    print(f"Command: {' '.join(cmd)}")

    try:
        subprocess.check_call(cmd, cwd=script_dir)
        print("\nBuild successful!")
        print(f"Executable is in: {dist_dir}")

        if os.path.exists(dist_dir):
            print("\nCreated files:")
            for f in os.listdir(dist_dir):
                filepath = os.path.join(dist_dir, f)
                size = os.path.getsize(filepath) / (1024 * 1024)
                print(f"  - {f} ({size:.1f} MB)")

            print("\nUsage:")
            print("  1. Copy AnalogClock.exe to your desired location")
            print("  2. Double-click to run")
            print("  3. Right-click on the clock for settings")

    except subprocess.CalledProcessError as e:
        print(f"Build failed with error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    build()
