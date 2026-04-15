import numpy as np
from traffic_simulation import TrafficSimulation
from rl_agent import QLearningAgent
from genetic_algorithm import RouteOptimizerGA
from visualization import plot_rl_training, plot_ga_evolution

def train_rl_agent(sim, episodes=600):
    print("=========================================================")
    print(" 1. TRAINING REINFORCEMENT LEARNING AGENT (Q-Learning) ")
    print("=========================================================")
    print("The agent will take control of a highly congested central intersection.")
    print("Its goal: Learn how to toggle signal lights to minimize overall wait times.\n")
    
    # Initialize the specific agent for one central intersection (5, 5)
    agent = QLearningAgent(state_size=(4, 4), action_size=2)
    x, y = 5, 5 
    
    rewards_history = []
    
    for ep in range(episodes):
        sim.smart_signal_timing(min_green=3, max_green=12, switch_ratio=1.3, backlog_gap=8)

        # 1. Observe state
        state = sim.get_state(x, y)
        
        # 2. Decide Action (0 = NS Green, 1 = EW Green)
        action = agent.choose_action(state)
        
        # 3. Apply Action
        sim.signals[x, y] = action
        
        # 4. Advance world by 1 tick
        sim.step(use_real_profile=True)
        
        # 5. Determine Reward (Negative of the total waiting cars - so we maximize it)
        next_state = sim.get_state(x, y)
        reward = -(sim.ns_wait[x, y] + sim.ew_wait[x, y])
        
        # 6. Learn from action
        agent.learn(state, action, reward, next_state)
        rewards_history.append(reward)
        
        # Decay exploration
        agent.epsilon = max(0.01, agent.epsilon * 0.99)
        
        # Console output every 100 episodes
        if (ep + 1) % 100 == 0:
            print(f"Episode {ep+1:04d} | Reward: {reward:07.2f} | Exploration Strategy eps: {agent.epsilon:.2f}")
            
    # Visualize
    plot_rl_training(rewards_history)
    print("\n-> RL Training complete. Graph systematically saved as 'rl_training.png'.\n")
    return agent

def optimize_routes(sim):
    print("=========================================================")
    print(" 2. OPTIMIZING TRAFFIC ROUTES WITH GENETIC ALGORITHMS ")
    print("=========================================================")
    
    # We aggregate NS wait and EW wait at each intersection to map 'hotzones'
    congestion_map = sim.ns_wait + sim.ew_wait
    
    print("Snapshot of congestion center-grid [Rows 4-6, Cols 4-6]:")
    print(congestion_map[4:7, 4:7].astype(int))
    print("")
    
    ga = RouteOptimizerGA(grid=congestion_map, start=(0,0), end=(9,9), pop_size=60, generations=80)
    best_route, fitness_history = ga.run()
    
    plot_ga_evolution(fitness_history)
    
    # Translate route commands (0='Right', 1='Down') back into grid Coordinates
    path = [(0,0)]
    cx, cy = 0, 0
    for direction in best_route:
        if direction == 0: cx += 1  # East
        else: cy += 1               # South
        path.append((cx, cy))
        
    print(f"-> Evolutionary search concluded. Best routing matrix to destination found:")
    # Print clean blocks
    for i in range(0, len(path), 5):
        print(path[i:i+5])
        
    print("\n-> GA Optimization complete. Details saved as 'ga_evolution.png'.\n")

def main():
    print("\n" + "#" * 55)
    print(" EvoCity: Self-Optimizing Smart City AI Simulation")
    print("#" * 55 + "\n")
    
    print("Initializing City 10x10 Core Matrix Framework...")
    sim = TrafficSimulation(size=10)
    
    print("Applying environmental stress testing (Simulating Base Traffic)...")
    for _ in range(150):
        sim.smart_signal_timing(min_green=3, max_green=12, switch_ratio=1.3, backlog_gap=8)
        sim.step(use_real_profile=True)
        
    print("Initiating modules...")
    
    # Execute AI Modules
    train_rl_agent(sim, episodes=700)
    optimize_routes(sim)
    
    print("=========================================================")
    print("EvoCity execution pipeline finished effortlessly!")
    print("Please view 'rl_training.png' & 'ga_evolution.png' inside directory.")
    print("=========================================================\n")

if __name__ == "__main__":
    main()
