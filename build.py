#!/usr/bin/env python3
"""
Build script for Analog Clock application.
Creates standalone executables for Windows, macOS, and Linux.
"""

import subprocess
import sys
import os
import shutil

def build():
    """Build the application using PyInstaller."""
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
    spec_file = os.path.join(script_dir, 'analog_clock.spec')

    for path in [dist_dir, build_dir]:
        if os.path.exists(path):
            shutil.rmtree(path)
    if os.path.exists(spec_file):
        os.remove(spec_file)

    # Determine platform-specific options
    platform_opts = []
    if sys.platform == 'win32':
        platform_opts = ['--noconsole']  # Hide console on Windows
    elif sys.platform == 'darwin':
        platform_opts = ['--noconsole', '--windowed']  # macOS app bundle

    # Build command
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',           # Single executable
        '--name', 'AnalogClock',
        *platform_opts,
        main_script
    ]

    print("Building Analog Clock...")
    print(f"Command: {' '.join(cmd)}")

    try:
        subprocess.check_call(cmd, cwd=script_dir)
        print("\nBuild successful!")
        print(f"Executable is in: {dist_dir}")

        # List the created files
        if os.path.exists(dist_dir):
            print("\nCreated files:")
            for f in os.listdir(dist_dir):
                filepath = os.path.join(dist_dir, f)
                size = os.path.getsize(filepath) / (1024 * 1024)
                print(f"  - {f} ({size:.1f} MB)")

    except subprocess.CalledProcessError as e:
        print(f"Build failed with error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    build()
