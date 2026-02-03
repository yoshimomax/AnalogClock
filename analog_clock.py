#!/usr/bin/env python3
"""
Analog Clock Desktop Application
A simple analog clock that displays on your desktop.
"""

import tkinter as tk
import math
from datetime import datetime


class AnalogClock:
    def __init__(self, root):
        self.root = root
        self.root.title("Analog Clock")
        self.root.resizable(False, False)

        # Clock dimensions
        self.size = 400
        self.center = self.size // 2
        self.clock_radius = 180

        # Create canvas
        self.canvas = tk.Canvas(
            root,
            width=self.size,
            height=self.size,
            bg='white',
            highlightthickness=0
        )
        self.canvas.pack()

        # Draw static elements
        self.draw_clock_face()

        # Start the clock
        self.update_clock()

    def draw_clock_face(self):
        """Draw the clock face with numbers and tick marks."""
        # Draw outer circle
        self.canvas.create_oval(
            self.center - self.clock_radius,
            self.center - self.clock_radius,
            self.center + self.clock_radius,
            self.center + self.clock_radius,
            width=3,
            outline='#333333'
        )

        # Draw inner decorative circle
        inner_radius = self.clock_radius - 10
        self.canvas.create_oval(
            self.center - inner_radius,
            self.center - inner_radius,
            self.center + inner_radius,
            self.center + inner_radius,
            width=1,
            outline='#cccccc'
        )

        # Draw hour marks and numbers
        for i in range(12):
            angle = math.radians(i * 30 - 90)

            # Hour tick marks
            outer_x = self.center + (self.clock_radius - 15) * math.cos(angle)
            outer_y = self.center + (self.clock_radius - 15) * math.sin(angle)
            inner_x = self.center + (self.clock_radius - 30) * math.cos(angle)
            inner_y = self.center + (self.clock_radius - 30) * math.sin(angle)

            self.canvas.create_line(
                inner_x, inner_y, outer_x, outer_y,
                width=3,
                fill='#333333'
            )

            # Hour numbers
            num = 12 if i == 0 else i
            num_x = self.center + (self.clock_radius - 50) * math.cos(angle)
            num_y = self.center + (self.clock_radius - 50) * math.sin(angle)

            self.canvas.create_text(
                num_x, num_y,
                text=str(num),
                font=('Helvetica', 16, 'bold'),
                fill='#333333'
            )

        # Draw minute tick marks
        for i in range(60):
            if i % 5 != 0:  # Skip hour positions
                angle = math.radians(i * 6 - 90)
                outer_x = self.center + (self.clock_radius - 15) * math.cos(angle)
                outer_y = self.center + (self.clock_radius - 15) * math.sin(angle)
                inner_x = self.center + (self.clock_radius - 22) * math.cos(angle)
                inner_y = self.center + (self.clock_radius - 22) * math.sin(angle)

                self.canvas.create_line(
                    inner_x, inner_y, outer_x, outer_y,
                    width=1,
                    fill='#666666'
                )

        # Draw center dot
        self.canvas.create_oval(
            self.center - 8,
            self.center - 8,
            self.center + 8,
            self.center + 8,
            fill='#333333',
            outline='#333333'
        )

    def draw_hand(self, angle, length, width, color, tag):
        """Draw a clock hand at the specified angle."""
        # Convert angle to radians (0 degrees = 12 o'clock)
        rad = math.radians(angle - 90)

        # Calculate end point
        end_x = self.center + length * math.cos(rad)
        end_y = self.center + length * math.sin(rad)

        # Calculate back end (small tail)
        back_x = self.center - (length * 0.15) * math.cos(rad)
        back_y = self.center - (length * 0.15) * math.sin(rad)

        # Draw the hand
        self.canvas.create_line(
            back_x, back_y, end_x, end_y,
            width=width,
            fill=color,
            capstyle=tk.ROUND,
            tags=tag
        )

    def update_clock(self):
        """Update the clock hands every second."""
        # Remove old hands
        self.canvas.delete('hands')

        # Get current time
        now = datetime.now()
        hours = now.hour % 12
        minutes = now.minute
        seconds = now.second

        # Calculate angles
        second_angle = seconds * 6
        minute_angle = minutes * 6 + seconds * 0.1
        hour_angle = hours * 30 + minutes * 0.5

        # Draw hands (order matters for layering)
        # Hour hand
        self.draw_hand(
            hour_angle,
            self.clock_radius * 0.5,
            6,
            '#333333',
            'hands'
        )

        # Minute hand
        self.draw_hand(
            minute_angle,
            self.clock_radius * 0.7,
            4,
            '#555555',
            'hands'
        )

        # Second hand
        self.draw_hand(
            second_angle,
            self.clock_radius * 0.85,
            2,
            '#cc0000',
            'hands'
        )

        # Draw center cap
        self.canvas.create_oval(
            self.center - 5,
            self.center - 5,
            self.center + 5,
            self.center + 5,
            fill='#cc0000',
            outline='#cc0000',
            tags='hands'
        )

        # Schedule next update
        self.root.after(1000, self.update_clock)


def main():
    root = tk.Tk()

    # Optional: Make window stay on top
    # root.attributes('-topmost', True)

    # Optional: Remove window decorations for a cleaner look
    # root.overrideredirect(True)

    clock = AnalogClock(root)
    root.mainloop()


if __name__ == '__main__':
    main()
