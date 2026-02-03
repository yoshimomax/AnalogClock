#!/usr/bin/env python3
"""
Analog Clock Desktop Application
A customizable analog clock with transparency, resizing, drag & drop,
and target time indicator features.
"""

import tkinter as tk
from tkinter import ttk
import math
from datetime import datetime
import json
import os
import sys


def get_config_path():
    """Get the path for the configuration file."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        app_dir = os.path.dirname(sys.executable)
    else:
        # Running as script
        app_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(app_dir, 'clock_config.json')


class AnalogClock:
    DEFAULT_CONFIG = {
        'size': 300,
        'transparency': 1.0,
        'position_x': None,
        'position_y': None,
        'target_enabled': False,
        'target_hour': 12,
        'target_minute': 0,
        'always_on_top': True,
        'show_seconds': True,
    }

    def __init__(self, root):
        self.root = root
        self.root.title("Analog Clock")

        # Load configuration
        self.config = self.load_config()

        # Initialize size variables
        self.size = self.config['size']
        self.update_dimensions()

        # Setup window
        self.setup_window()

        # Create main frame
        self.main_frame = tk.Frame(root)
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        # Create canvas
        self.canvas = tk.Canvas(
            self.main_frame,
            width=self.size,
            height=self.size,
            bg='white',
            highlightthickness=0
        )
        self.canvas.pack()

        # Bind drag events
        self.setup_drag()

        # Bind right-click for settings
        self.canvas.bind('<Button-3>', self.show_settings)

        # Settings window reference
        self.settings_window = None

        # Draw clock
        self.draw_clock_face()
        self.update_clock()

    def update_dimensions(self):
        """Update dimensions based on current size."""
        self.center = self.size // 2
        self.clock_radius = int(self.size * 0.45)

    def setup_window(self):
        """Setup window properties."""
        self.root.overrideredirect(True)  # Remove window decorations
        self.root.attributes('-topmost', self.config['always_on_top'])

        # Set transparency
        self.set_transparency(self.config['transparency'])

        # Set position
        if self.config['position_x'] is not None:
            self.root.geometry(f"+{self.config['position_x']}+{self.config['position_y']}")

    def set_transparency(self, value):
        """Set window transparency (0.0 to 1.0)."""
        self.config['transparency'] = value
        try:
            self.root.attributes('-alpha', value)
        except tk.TclError:
            pass  # Some systems don't support transparency

    def setup_drag(self):
        """Setup drag and drop functionality."""
        self.drag_data = {'x': 0, 'y': 0}
        self.canvas.bind('<Button-1>', self.on_drag_start)
        self.canvas.bind('<B1-Motion>', self.on_drag_motion)
        self.canvas.bind('<ButtonRelease-1>', self.on_drag_end)

    def on_drag_start(self, event):
        """Record the starting position for drag."""
        self.drag_data['x'] = event.x
        self.drag_data['y'] = event.y

    def on_drag_motion(self, event):
        """Move the window during drag."""
        delta_x = event.x - self.drag_data['x']
        delta_y = event.y - self.drag_data['y']
        new_x = self.root.winfo_x() + delta_x
        new_y = self.root.winfo_y() + delta_y
        self.root.geometry(f"+{new_x}+{new_y}")

    def on_drag_end(self, event):
        """Save position when drag ends."""
        self.config['position_x'] = self.root.winfo_x()
        self.config['position_y'] = self.root.winfo_y()
        self.save_config()

    def load_config(self):
        """Load configuration from file."""
        config_path = get_config_path()
        try:
            with open(config_path, 'r') as f:
                loaded = json.load(f)
                # Merge with defaults to handle missing keys
                config = self.DEFAULT_CONFIG.copy()
                config.update(loaded)
                return config
        except (FileNotFoundError, json.JSONDecodeError):
            return self.DEFAULT_CONFIG.copy()

    def save_config(self):
        """Save configuration to file."""
        config_path = get_config_path()
        try:
            with open(config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
        except IOError:
            pass  # Silently fail if can't save

    def resize_clock(self, new_size):
        """Resize the clock."""
        self.size = new_size
        self.config['size'] = new_size
        self.update_dimensions()

        # Resize canvas
        self.canvas.config(width=self.size, height=self.size)

        # Redraw
        self.canvas.delete('all')
        self.draw_clock_face()
        self.save_config()

    def draw_clock_face(self):
        """Draw the clock face with numbers and tick marks."""
        self.canvas.delete('face')

        # Draw outer circle
        self.canvas.create_oval(
            self.center - self.clock_radius,
            self.center - self.clock_radius,
            self.center + self.clock_radius,
            self.center + self.clock_radius,
            width=3,
            outline='#333333',
            fill='white',
            tags='face'
        )

        # Draw inner decorative circle
        inner_radius = self.clock_radius - int(self.clock_radius * 0.055)
        self.canvas.create_oval(
            self.center - inner_radius,
            self.center - inner_radius,
            self.center + inner_radius,
            self.center + inner_radius,
            width=1,
            outline='#cccccc',
            tags='face'
        )

        # Calculate font size based on clock size
        font_size = max(8, int(self.size * 0.04))

        # Draw hour marks and numbers
        for i in range(12):
            angle = math.radians(i * 30 - 90)

            # Hour tick marks
            outer_x = self.center + (self.clock_radius - int(self.clock_radius * 0.08)) * math.cos(angle)
            outer_y = self.center + (self.clock_radius - int(self.clock_radius * 0.08)) * math.sin(angle)
            inner_x = self.center + (self.clock_radius - int(self.clock_radius * 0.17)) * math.cos(angle)
            inner_y = self.center + (self.clock_radius - int(self.clock_radius * 0.17)) * math.sin(angle)

            self.canvas.create_line(
                inner_x, inner_y, outer_x, outer_y,
                width=max(2, int(self.size * 0.008)),
                fill='#333333',
                tags='face'
            )

            # Hour numbers
            num = 12 if i == 0 else i
            num_x = self.center + (self.clock_radius - int(self.clock_radius * 0.28)) * math.cos(angle)
            num_y = self.center + (self.clock_radius - int(self.clock_radius * 0.28)) * math.sin(angle)

            self.canvas.create_text(
                num_x, num_y,
                text=str(num),
                font=('Helvetica', font_size, 'bold'),
                fill='#333333',
                tags='face'
            )

        # Draw minute tick marks
        for i in range(60):
            if i % 5 != 0:
                angle = math.radians(i * 6 - 90)
                outer_x = self.center + (self.clock_radius - int(self.clock_radius * 0.08)) * math.cos(angle)
                outer_y = self.center + (self.clock_radius - int(self.clock_radius * 0.08)) * math.sin(angle)
                inner_x = self.center + (self.clock_radius - int(self.clock_radius * 0.12)) * math.cos(angle)
                inner_y = self.center + (self.clock_radius - int(self.clock_radius * 0.12)) * math.sin(angle)

                self.canvas.create_line(
                    inner_x, inner_y, outer_x, outer_y,
                    width=1,
                    fill='#666666',
                    tags='face'
                )

        # Draw center dot
        center_size = max(4, int(self.size * 0.02))
        self.canvas.create_oval(
            self.center - center_size,
            self.center - center_size,
            self.center + center_size,
            self.center + center_size,
            fill='#333333',
            outline='#333333',
            tags='face'
        )

    def draw_hand(self, angle, length, width, color, tag, dashed=False):
        """Draw a clock hand at the specified angle."""
        rad = math.radians(angle - 90)

        end_x = self.center + length * math.cos(rad)
        end_y = self.center + length * math.sin(rad)

        back_x = self.center - (length * 0.15) * math.cos(rad)
        back_y = self.center - (length * 0.15) * math.sin(rad)

        kwargs = {
            'width': width,
            'fill': color,
            'capstyle': tk.ROUND,
            'tags': tag
        }
        if dashed:
            kwargs['dash'] = (6, 4)

        self.canvas.create_line(back_x, back_y, end_x, end_y, **kwargs)

    def draw_target_hands(self):
        """Draw target time indicator hands."""
        if not self.config['target_enabled']:
            return

        hour = self.config['target_hour'] % 12
        minute = self.config['target_minute']

        minute_angle = minute * 6
        hour_angle = hour * 30 + minute * 0.5

        # Draw target hour hand (green, dashed)
        self.draw_hand(
            hour_angle,
            self.clock_radius * 0.5,
            max(3, int(self.size * 0.012)),
            '#00aa00',
            'target',
            dashed=True
        )

        # Draw target minute hand (green, dashed)
        self.draw_hand(
            minute_angle,
            self.clock_radius * 0.7,
            max(2, int(self.size * 0.008)),
            '#00aa00',
            'target',
            dashed=True
        )

    def update_clock(self):
        """Update the clock hands every second."""
        self.canvas.delete('hands')
        self.canvas.delete('target')

        # Draw target time first (behind current time)
        self.draw_target_hands()

        # Get current time
        now = datetime.now()
        hours = now.hour % 12
        minutes = now.minute
        seconds = now.second

        # Calculate angles
        second_angle = seconds * 6
        minute_angle = minutes * 6 + seconds * 0.1
        hour_angle = hours * 30 + minutes * 0.5

        # Draw hands
        # Hour hand
        self.draw_hand(
            hour_angle,
            self.clock_radius * 0.5,
            max(4, int(self.size * 0.015)),
            '#333333',
            'hands'
        )

        # Minute hand
        self.draw_hand(
            minute_angle,
            self.clock_radius * 0.7,
            max(3, int(self.size * 0.01)),
            '#555555',
            'hands'
        )

        # Second hand
        if self.config['show_seconds']:
            self.draw_hand(
                second_angle,
                self.clock_radius * 0.85,
                max(1, int(self.size * 0.005)),
                '#cc0000',
                'hands'
            )

        # Draw center cap
        cap_size = max(3, int(self.size * 0.012))
        self.canvas.create_oval(
            self.center - cap_size,
            self.center - cap_size,
            self.center + cap_size,
            self.center + cap_size,
            fill='#cc0000',
            outline='#cc0000',
            tags='hands'
        )

        # Schedule next update
        self.root.after(1000, self.update_clock)

    def show_settings(self, event=None):
        """Show settings window."""
        if self.settings_window is not None and self.settings_window.winfo_exists():
            self.settings_window.lift()
            return

        self.settings_window = tk.Toplevel(self.root)
        self.settings_window.title("Settings")
        self.settings_window.geometry("320x420")
        self.settings_window.resizable(False, False)
        self.settings_window.attributes('-topmost', True)

        # Main frame with padding
        main = ttk.Frame(self.settings_window, padding="15")
        main.pack(fill=tk.BOTH, expand=True)

        row = 0

        # --- Transparency ---
        ttk.Label(main, text="Transparency:", font=('Helvetica', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=(0, 5))
        row += 1

        self.transparency_var = tk.DoubleVar(value=self.config['transparency'])
        transparency_scale = ttk.Scale(
            main, from_=0.2, to=1.0,
            variable=self.transparency_var,
            orient=tk.HORIZONTAL,
            command=lambda v: self.set_transparency(float(v))
        )
        transparency_scale.grid(row=row, column=0, sticky='ew', pady=(0, 15))
        row += 1

        # --- Size ---
        ttk.Label(main, text="Size:", font=('Helvetica', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=(0, 5))
        row += 1

        size_frame = ttk.Frame(main)
        size_frame.grid(row=row, column=0, sticky='ew', pady=(0, 15))

        self.size_var = tk.IntVar(value=self.config['size'])
        size_scale = ttk.Scale(
            size_frame, from_=150, to=600,
            variable=self.size_var,
            orient=tk.HORIZONTAL,
            command=lambda v: self.on_size_change(int(float(v)))
        )
        size_scale.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.size_label = ttk.Label(size_frame, text=f"{self.config['size']}px", width=6)
        self.size_label.pack(side=tk.LEFT, padx=(10, 0))
        row += 1

        # --- Target Time ---
        ttk.Label(main, text="Target Time:", font=('Helvetica', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=(0, 5))
        row += 1

        self.target_enabled_var = tk.BooleanVar(value=self.config['target_enabled'])
        target_check = ttk.Checkbutton(
            main, text="Show target time indicator",
            variable=self.target_enabled_var,
            command=self.on_target_toggle
        )
        target_check.grid(row=row, column=0, sticky='w')
        row += 1

        time_frame = ttk.Frame(main)
        time_frame.grid(row=row, column=0, sticky='w', pady=(5, 15))

        ttk.Label(time_frame, text="Hour:").pack(side=tk.LEFT)
        self.target_hour_var = tk.StringVar(value=str(self.config['target_hour']))
        hour_spin = ttk.Spinbox(
            time_frame, from_=0, to=23, width=5,
            textvariable=self.target_hour_var,
            command=self.on_target_time_change
        )
        hour_spin.pack(side=tk.LEFT, padx=(5, 15))
        hour_spin.bind('<Return>', lambda e: self.on_target_time_change())
        hour_spin.bind('<FocusOut>', lambda e: self.on_target_time_change())

        ttk.Label(time_frame, text="Minute:").pack(side=tk.LEFT)
        self.target_minute_var = tk.StringVar(value=str(self.config['target_minute']))
        minute_spin = ttk.Spinbox(
            time_frame, from_=0, to=59, width=5,
            textvariable=self.target_minute_var,
            command=self.on_target_time_change
        )
        minute_spin.pack(side=tk.LEFT, padx=(5, 0))
        minute_spin.bind('<Return>', lambda e: self.on_target_time_change())
        minute_spin.bind('<FocusOut>', lambda e: self.on_target_time_change())
        row += 1

        # --- Options ---
        ttk.Label(main, text="Options:", font=('Helvetica', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=(0, 5))
        row += 1

        self.topmost_var = tk.BooleanVar(value=self.config['always_on_top'])
        topmost_check = ttk.Checkbutton(
            main, text="Always on top",
            variable=self.topmost_var,
            command=self.on_topmost_toggle
        )
        topmost_check.grid(row=row, column=0, sticky='w')
        row += 1

        self.seconds_var = tk.BooleanVar(value=self.config['show_seconds'])
        seconds_check = ttk.Checkbutton(
            main, text="Show second hand",
            variable=self.seconds_var,
            command=self.on_seconds_toggle
        )
        seconds_check.grid(row=row, column=0, sticky='w', pady=(0, 15))
        row += 1

        # --- Buttons ---
        button_frame = ttk.Frame(main)
        button_frame.grid(row=row, column=0, sticky='ew', pady=(10, 0))

        ttk.Button(
            button_frame, text="Close",
            command=self.settings_window.destroy
        ).pack(side=tk.RIGHT)

        ttk.Button(
            button_frame, text="Quit App",
            command=self.quit_app
        ).pack(side=tk.LEFT)

        # Configure column to expand
        main.columnconfigure(0, weight=1)

    def on_size_change(self, value):
        """Handle size slider change."""
        self.size_label.config(text=f"{value}px")
        self.resize_clock(value)

    def on_target_toggle(self):
        """Handle target time toggle."""
        self.config['target_enabled'] = self.target_enabled_var.get()
        self.save_config()

    def on_target_time_change(self):
        """Handle target time change."""
        try:
            hour = int(self.target_hour_var.get())
            minute = int(self.target_minute_var.get())
            self.config['target_hour'] = max(0, min(23, hour))
            self.config['target_minute'] = max(0, min(59, minute))
            self.save_config()
        except ValueError:
            pass

    def on_topmost_toggle(self):
        """Handle always on top toggle."""
        self.config['always_on_top'] = self.topmost_var.get()
        self.root.attributes('-topmost', self.config['always_on_top'])
        self.save_config()

    def on_seconds_toggle(self):
        """Handle show seconds toggle."""
        self.config['show_seconds'] = self.seconds_var.get()
        self.save_config()

    def quit_app(self):
        """Quit the application."""
        self.save_config()
        self.root.quit()


def main():
    root = tk.Tk()
    clock = AnalogClock(root)
    root.mainloop()


if __name__ == '__main__':
    main()
