import numpy as np
import csv
import os
import time
import math

class TrafficSimulation:
    def __init__(self, size=10, tick_minutes=5):
        """
        Initializes a 2D City Grid. Each cell is an intersection.
        size: the dimensions of the grid (default 10x10)
        """
        self.size = size
        self.tick_minutes = tick_minutes
        self.steps_per_day = int((24 * 60) / tick_minutes)
        self.current_tick = 0

        # Keep track of waiting cars moving North/South (NS) and East/West (EW)
        self.ns_wait = np.zeros((size, size))
        self.ew_wait = np.zeros((size, size))
        
        # Signal states: 0 = NS is green, 1 = EW is green
        self.signals = np.zeros((size, size), dtype=int)
        # Tracks how many ticks the current green phase has been active
        self.phase_age = np.zeros((size, size), dtype=int)

        # Approximate demand pattern inspired by common urban 24-hour traffic profiles.
        # Values represent expected arrivals per 5-minute tick at an intersection.
        self.traffic_profiles = [
            {"label": "late-night", "start_hour": 0, "end_hour": 6, "ns_lambda": 0.28, "ew_lambda": 0.22},
            {"label": "morning-peak", "start_hour": 6, "end_hour": 10, "ns_lambda": 1.35, "ew_lambda": 1.12},
            {"label": "midday", "start_hour": 10, "end_hour": 16, "ns_lambda": 0.85, "ew_lambda": 0.90},
            {"label": "evening-peak", "start_hour": 16, "end_hour": 20, "ns_lambda": 1.22, "ew_lambda": 1.38},
            {"label": "night", "start_hour": 20, "end_hour": 24, "ns_lambda": 0.55, "ew_lambda": 0.48},
        ]
        self.hourly_dataset_profiles = {}

    def get_live_traffic_data(self):
        """
        Simulates real-time traffic demand with time-of-day waves plus noise.
        Returns directional arrival rates used by the simulation tick.
        """
        now = time.localtime()
        fractional_hour = now.tm_hour + (now.tm_min / 60.0) + (now.tm_sec / 3600.0)

        # Morning/evening commute peaks using smooth Gaussian curves.
        morning_peak = math.exp(-((fractional_hour - 8.0) ** 2) / 5.5)
        evening_peak = math.exp(-((fractional_hour - 18.0) ** 2) / 6.5)
        day_cycle = (math.sin(((fractional_hour - 6.0) / 24.0) * 2.0 * math.pi) + 1.0) / 2.0

        base = 0.24 + 0.35 * day_cycle
        ns_rate = base + (0.70 * morning_peak) + (0.45 * evening_peak) + np.random.uniform(-0.06, 0.06)
        ew_rate = base + (0.45 * morning_peak) + (0.72 * evening_peak) + np.random.uniform(-0.06, 0.06)

        ns_rate = float(np.clip(ns_rate, 0.08, 1.8))
        ew_rate = float(np.clip(ew_rate, 0.08, 1.8))

        if morning_peak >= evening_peak and morning_peak > 0.25:
            label = "morning-commute"
        elif evening_peak > morning_peak and evening_peak > 0.25:
            label = "evening-commute"
        elif day_cycle > 0.55:
            label = "midday-flow"
        else:
            label = "off-peak"

        return {
            "hour": round(fractional_hour, 2),
            "label": label,
            "ns_lambda": ns_rate,
            "ew_lambda": ew_rate,
            "source": "live",
        }

    def load_real_traffic_dataset(self, csv_path):
        """
        Loads an hourly traffic demand dataset from CSV.
        Expected columns: hour, period, ns_lambda, ew_lambda
        """
        if not os.path.exists(csv_path):
            return False

        loaded = {}
        with open(csv_path, mode="r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                hour = int(row["hour"])
                loaded[hour] = {
                    "label": str(row.get("period", f"hour-{hour}")).replace("_", "-"),
                    "ns_lambda": float(row["ns_lambda"]),
                    "ew_lambda": float(row["ew_lambda"]),
                }

        if len(loaded) == 24:
            self.hourly_dataset_profiles = loaded
            return True

        return False

    def get_dataset_profile(self):
        """
        Returns active profile from loaded CSV hourly data if available.
        """
        if not self.hourly_dataset_profiles:
            return None

        hour_of_day = ((self.current_tick * self.tick_minutes) % (24 * 60)) / 60.0
        active_hour = int(hour_of_day)
        profile = self.hourly_dataset_profiles.get(active_hour)
        if profile is None:
            return None
        return {
            "hour": round(hour_of_day, 2),
            "label": profile["label"],
            "ns_lambda": profile["ns_lambda"],
            "ew_lambda": profile["ew_lambda"],
            "source": "csv",
        }

    def get_traffic_profile(self):
        """
        Returns the active time-of-day demand profile.
        """
        # Real-time mode preferred for live execution.
        return self.get_live_traffic_data()

    def get_static_profile(self):
        """
        Optional static profile lookup retained for offline experimentation.
        """
        dataset_profile = self.get_dataset_profile()
        if dataset_profile is not None:
            return dataset_profile

        hour_of_day = ((self.current_tick * self.tick_minutes) % (24 * 60)) / 60.0
        for profile in self.traffic_profiles:
            if profile["start_hour"] <= hour_of_day < profile["end_hour"]:
                return {
                    "hour": round(hour_of_day, 2),
                    "label": profile["label"],
                    "ns_lambda": profile["ns_lambda"],
                    "ew_lambda": profile["ew_lambda"],
                    "source": "built-in",
                }
        # Fallback should never trigger, but keeps behavior safe.
        return {
            "hour": round(hour_of_day, 2),
            "label": "default",
            "ns_lambda": 0.8,
            "ew_lambda": 0.8,
            "source": "built-in",
        }

    def smart_signal_timing(self, min_green=3, max_green=12, switch_ratio=1.3, backlog_gap=8):
        """
        Adaptive signal timing using pressure/backlog balancing.
        Keeps minimum green time to avoid frequent flicker and enforces max green to prevent starvation.
        """
        for i in range(self.size):
            for j in range(self.size):
                current_phase = self.signals[i, j]
                age = self.phase_age[i, j]
                ns_backlog = self.ns_wait[i, j]
                ew_backlog = self.ew_wait[i, j]

                if age < min_green:
                    continue

                if current_phase == 0:
                    switch_now = (
                        ew_backlog > (ns_backlog * switch_ratio)
                        or (ew_backlog - ns_backlog) >= backlog_gap
                        or age >= max_green
                    )
                    if switch_now:
                        self.signals[i, j] = 1
                        self.phase_age[i, j] = 0
                else:
                    switch_now = (
                        ns_backlog > (ew_backlog * switch_ratio)
                        or (ns_backlog - ew_backlog) >= backlog_gap
                        or age >= max_green
                    )
                    if switch_now:
                        self.signals[i, j] = 0
                        self.phase_age[i, j] = 0
        
    def step(self, use_real_profile=True, ns_arrival_rate=None, ew_arrival_rate=None):
        """
        Advances the simulation by one time step.
        Returns the total congestion across the entire city.
        """
        if ns_arrival_rate is not None and ew_arrival_rate is not None:
            ns_rate = ns_arrival_rate
            ew_rate = ew_arrival_rate
        elif use_real_profile:
            profile = self.get_traffic_profile()
            ns_rate = profile["ns_lambda"]
            ew_rate = profile["ew_lambda"]
        else:
            profile = self.get_static_profile()
            ns_rate = profile["ns_lambda"]
            ew_rate = profile["ew_lambda"]

        # Cars arrive randomly at intersections (Poisson distribution)
        self.ns_wait += np.random.poisson(ns_rate, (self.size, self.size))
        self.ew_wait += np.random.poisson(ew_rate, (self.size, self.size))
        
        # Calculate which intersections have which lights green
        ns_green = (self.signals == 0)
        ew_green = (self.signals == 1)
        
        # If it's green, up to 3 cars can cross the intersection in this tick
        self.ns_wait[ns_green] = np.maximum(0, self.ns_wait[ns_green] - 3)
        self.ew_wait[ew_green] = np.maximum(0, self.ew_wait[ew_green] - 3)

        self.phase_age += 1
        self.current_tick += 1
        
        # Total congestion is the sum of all waiting cars on red lights + remaining on green
        total_congestion = np.sum(self.ns_wait) + np.sum(self.ew_wait)
        return total_congestion
        
    def get_state(self, x, y):
        """
        Discretize the current wait times for the RL Agent into categories (0 to 3).
        This provides a defined state space representation for Q-learning.
        """
        ns_category = min(3, int(self.ns_wait[x, y] // 3))
        ew_category = min(3, int(self.ew_wait[x, y] // 3))
        return (ns_category, ew_category)
