#!/usr/bin/env python3
"""
Analog Clock Desktop Application for Windows
A customizable analog clock with transparent background, resizing, drag & drop,
face color selection, and target time indicator features.
"""

import tkinter as tk
from tkinter import ttk, colorchooser
import math
from datetime import datetime
import json
import os
import sys

# Transparent color key for Windows
TRANSPARENT_COLOR = '#FF00FF'


def get_config_path():
    """Get the path for the configuration file."""
    if getattr(sys, 'frozen', False):
        app_dir = os.path.dirname(sys.executable)
    else:
        app_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(app_dir, 'clock_config.json')


class AnalogClock:
    DEFAULT_CONFIG = {
        'size': 300,
        'opacity': 1.0,
        'position_x': None,
        'position_y': None,
        'target_enabled': False,
        'target_hour': 12,
        'target_minute': 0,
        'always_on_top': True,
        'show_seconds': True,
        'face_color': '#FFFFFF',
    }

    # Preset colors for face
    PRESET_COLORS = [
        ('#FFFFFF', 'White'),
        ('#F0F0F0', 'Light Gray'),
        ('#E8E8E8', 'Silver'),
        ('#FFFACD', 'Lemon'),
        ('#E6F3FF', 'Light Blue'),
        ('#E8FFE8', 'Light Green'),
        ('#FFE8E8', 'Light Pink'),
        ('#FFF0E0', 'Peach'),
        ('#2C2C2C', 'Dark Gray'),
        ('#1A1A2E', 'Dark Blue'),
    ]

    def __init__(self, root):
        self.root = root
        self.root.title("Analog Clock")

        # Load configuration
        self.config = self.load_config()

        # Initialize size variables
        self.size = self.config['size']
        self.update_dimensions()

        # Setup window with transparent background
        self.setup_window()

        # Create canvas with transparent background
        self.canvas = tk.Canvas(
            root,
            width=self.size,
            height=self.size,
            bg=TRANSPARENT_COLOR,
            highlightthickness=0
        )
        self.canvas.pack()

        # Setup drag with improved behavior
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
        """Setup window properties for Windows transparent background."""
        self.root.overrideredirect(True)
        self.root.attributes('-topmost', self.config['always_on_top'])

        # Windows-specific: make the transparent color actually transparent
        self.root.attributes('-transparentcolor', TRANSPARENT_COLOR)

        # Set overall window opacity
        self.set_opacity(self.config['opacity'])

        # Set window background to transparent color
        self.root.configure(bg=TRANSPARENT_COLOR)

        # Set position
        if self.config['position_x'] is not None:
            self.root.geometry(f"+{self.config['position_x']}+{self.config['position_y']}")

    def set_opacity(self, value):
        """Set window opacity (0.0 to 1.0)."""
        self.config['opacity'] = value
        try:
            self.root.attributes('-alpha', value)
        except tk.TclError:
            pass

    def setup_drag(self):
        """Setup improved drag and drop functionality."""
        self.drag_data = {'dragging': False, 'start_x': 0, 'start_y': 0}
        self.canvas.bind('<Button-1>', self.on_drag_start)
        self.canvas.bind('<B1-Motion>', self.on_drag_motion)
        self.canvas.bind('<ButtonRelease-1>', self.on_drag_end)

    def on_drag_start(self, event):
        """Record the starting screen position for drag."""
        self.drag_data['dragging'] = True
        # Store the initial mouse position in screen coordinates
        self.drag_data['start_x'] = self.root.winfo_pointerx()
        self.drag_data['start_y'] = self.root.winfo_pointery()
        # Store the initial window position
        self.drag_data['win_x'] = self.root.winfo_x()
        self.drag_data['win_y'] = self.root.winfo_y()

    def on_drag_motion(self, event):
        """Move the window during drag using screen coordinates."""
        if not self.drag_data['dragging']:
            return

        # Get current mouse position in screen coordinates
        current_x = self.root.winfo_pointerx()
        current_y = self.root.winfo_pointery()

        # Calculate delta from start position
        delta_x = current_x - self.drag_data['start_x']
        delta_y = current_y - self.drag_data['start_y']

        # Calculate new window position
        new_x = self.drag_data['win_x'] + delta_x
        new_y = self.drag_data['win_y'] + delta_y

        # Move window
        self.root.geometry(f"+{new_x}+{new_y}")

    def on_drag_end(self, event):
        """Save position when drag ends."""
        self.drag_data['dragging'] = False
        self.config['position_x'] = self.root.winfo_x()
        self.config['position_y'] = self.root.winfo_y()
        self.save_config()

    def load_config(self):
        """Load configuration from file."""
        config_path = get_config_path()
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                config = self.DEFAULT_CONFIG.copy()
                config.update(loaded)
                return config
        except (FileNotFoundError, json.JSONDecodeError):
            return self.DEFAULT_CONFIG.copy()

    def save_config(self):
        """Save configuration to file."""
        config_path = get_config_path()
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2)
        except IOError:
            pass

    def resize_clock(self, new_size):
        """Resize the clock."""
        self.size = new_size
        self.config['size'] = new_size
        self.update_dimensions()

        self.canvas.config(width=self.size, height=self.size)
        self.canvas.delete('all')
        self.draw_clock_face()
        self.save_config()

    def get_text_color(self):
        """Determine text color based on face color brightness."""
        face_color = self.config['face_color']
        # Convert hex to RGB
        r = int(face_color[1:3], 16)
        g = int(face_color[3:5], 16)
        b = int(face_color[5:7], 16)
        # Calculate luminance
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return '#FFFFFF' if luminance < 0.5 else '#333333'

    def draw_clock_face(self):
        """Draw the clock face with numbers and tick marks."""
        self.canvas.delete('face')

        face_color = self.config['face_color']
        text_color = self.get_text_color()
        tick_color = text_color
        inner_circle_color = '#AAAAAA' if text_color == '#333333' else '#555555'

        # Draw outer circle (clock face)
        self.canvas.create_oval(
            self.center - self.clock_radius,
            self.center - self.clock_radius,
            self.center + self.clock_radius,
            self.center + self.clock_radius,
            width=3,
            outline=text_color,
            fill=face_color,
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
            outline=inner_circle_color,
            tags='face'
        )

        font_size = max(8, int(self.size * 0.04))

        # Draw hour marks and numbers
        for i in range(12):
            angle = math.radians(i * 30 - 90)

            outer_x = self.center + (self.clock_radius - int(self.clock_radius * 0.08)) * math.cos(angle)
            outer_y = self.center + (self.clock_radius - int(self.clock_radius * 0.08)) * math.sin(angle)
            inner_x = self.center + (self.clock_radius - int(self.clock_radius * 0.17)) * math.cos(angle)
            inner_y = self.center + (self.clock_radius - int(self.clock_radius * 0.17)) * math.sin(angle)

            self.canvas.create_line(
                inner_x, inner_y, outer_x, outer_y,
                width=max(2, int(self.size * 0.008)),
                fill=tick_color,
                tags='face'
            )

            num = 12 if i == 0 else i
            num_x = self.center + (self.clock_radius - int(self.clock_radius * 0.28)) * math.cos(angle)
            num_y = self.center + (self.clock_radius - int(self.clock_radius * 0.28)) * math.sin(angle)

            self.canvas.create_text(
                num_x, num_y,
                text=str(num),
                font=('Helvetica', font_size, 'bold'),
                fill=text_color,
                tags='face'
            )

        # Draw minute tick marks
        minute_tick_color = '#888888' if text_color == '#333333' else '#888888'
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
                    fill=minute_tick_color,
                    tags='face'
                )

        # Draw center dot
        center_size = max(4, int(self.size * 0.02))
        self.canvas.create_oval(
            self.center - center_size,
            self.center - center_size,
            self.center + center_size,
            self.center + center_size,
            fill=text_color,
            outline=text_color,
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

        self.draw_hand(
            hour_angle,
            self.clock_radius * 0.5,
            max(3, int(self.size * 0.012)),
            '#00aa00',
            'target',
            dashed=True
        )

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

        self.draw_target_hands()

        now = datetime.now()
        hours = now.hour % 12
        minutes = now.minute
        seconds = now.second

        second_angle = seconds * 6
        minute_angle = minutes * 6 + seconds * 0.1
        hour_angle = hours * 30 + minutes * 0.5

        text_color = self.get_text_color()
        hand_color = text_color
        minute_hand_color = '#666666' if text_color == '#333333' else '#AAAAAA'

        self.draw_hand(
            hour_angle,
            self.clock_radius * 0.5,
            max(4, int(self.size * 0.015)),
            hand_color,
            'hands'
        )

        self.draw_hand(
            minute_angle,
            self.clock_radius * 0.7,
            max(3, int(self.size * 0.01)),
            minute_hand_color,
            'hands'
        )

        if self.config['show_seconds']:
            self.draw_hand(
                second_angle,
                self.clock_radius * 0.85,
                max(1, int(self.size * 0.005)),
                '#cc0000',
                'hands'
            )

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

        self.root.after(1000, self.update_clock)

    def show_settings(self, event=None):
        """Show settings window."""
        if self.settings_window is not None and self.settings_window.winfo_exists():
            self.settings_window.lift()
            return

        self.settings_window = tk.Toplevel(self.root)
        self.settings_window.title("Settings")
        self.settings_window.geometry("340x520")
        self.settings_window.resizable(False, False)
        self.settings_window.attributes('-topmost', True)

        main = ttk.Frame(self.settings_window, padding="15")
        main.pack(fill=tk.BOTH, expand=True)

        row = 0

        # --- Opacity ---
        ttk.Label(main, text="Opacity:", font=('Helvetica', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=(0, 5))
        row += 1

        self.opacity_var = tk.DoubleVar(value=self.config['opacity'])
        opacity_scale = ttk.Scale(
            main, from_=0.3, to=1.0,
            variable=self.opacity_var,
            orient=tk.HORIZONTAL,
            command=lambda v: self.set_opacity(float(v))
        )
        opacity_scale.grid(row=row, column=0, sticky='ew', pady=(0, 15))
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

        # --- Face Color ---
        ttk.Label(main, text="Face Color:", font=('Helvetica', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=(0, 5))
        row += 1

        color_frame = ttk.Frame(main)
        color_frame.grid(row=row, column=0, sticky='ew', pady=(0, 5))

        # Preset color buttons
        for i, (color, name) in enumerate(self.PRESET_COLORS):
            btn = tk.Button(
                color_frame,
                bg=color,
                width=2,
                height=1,
                relief=tk.RAISED,
                borderwidth=2,
                command=lambda c=color: self.set_face_color(c)
            )
            btn.grid(row=i // 5, column=i % 5, padx=2, pady=2)
        row += 1

        # Custom color button
        custom_btn = ttk.Button(
            main, text="Custom Color...",
            command=self.choose_custom_color
        )
        custom_btn.grid(row=row, column=0, sticky='w', pady=(5, 15))
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

        main.columnconfigure(0, weight=1)

    def set_face_color(self, color):
        """Set the clock face color."""
        self.config['face_color'] = color
        self.canvas.delete('all')
        self.draw_clock_face()
        self.save_config()

    def choose_custom_color(self):
        """Open color chooser for custom face color."""
        color = colorchooser.askcolor(
            initialcolor=self.config['face_color'],
            title="Choose Face Color"
        )
        if color[1]:
            self.set_face_color(color[1])

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
