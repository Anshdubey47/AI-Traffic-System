import matplotlib.pyplot as plt
import numpy as np

def plot_rl_training(rewards):
    plt.figure(figsize=(10, 5))
    
    # Smooth the rewards line for better visual interpretation (rolling average)
    window = max(1, len(rewards) // 15)
    smoothed = np.convolve(rewards, np.ones(window)/window, mode='valid')
    
    # Plotting
    plt.plot(rewards, color='lightblue', alpha=0.4, label='Raw Epoch Reward')
    plt.plot(smoothed, color='blue', linewidth=2, label='Learning Trend')
    
    plt.title("RL Agent Training: Optimizing Traffic Signals")
    plt.xlabel("Episode")
    plt.ylabel("Reward Score (Higher = Less Congestion)")
    
    plt.legend()
    plt.grid(True)
    plt.savefig("rl_training.png")
    plt.close()

def plot_ga_evolution(fitnesses):
    plt.figure(figsize=(10, 5))
    
    # Plotting
    plt.plot(fitnesses, color='green', linewidth=2, label='Best Generation Route Fitness')
    
    plt.title("Genetic Algorithm: Discovering the Fastest Route")
    plt.xlabel("Evolution Generation")
    plt.ylabel("Fitness (Higher = Less Traffic Encountered)")
    
    plt.legend()
    plt.grid(True)
    plt.savefig("ga_evolution.png")
    plt.close()
