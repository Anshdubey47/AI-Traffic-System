import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from traffic_simulation import TrafficSimulation

def run_live_simulation():
    print("Launching Live EvoCity Visualizer...")
    # Initialize our City Grid
    sim = TrafficSimulation(size=10)
    
    # Setup Matplotlib Figure
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.set_title("EvoCity: Live Traffic Grid \n(Brighter Colors = High Congestion)")
    
    # We use the 'hot' colormap. Black = Empty, Yellow/White = Heavy Traffic
    im = ax.imshow(np.zeros((10, 10)), cmap='hot', interpolation='nearest', vmin=0, vmax=20)
    plt.colorbar(im, ax=ax, label='Active Waiting Cars at Intersection')
    
    def update(frame):
        # Tick the simulation forward 1 frame
        sim.step()
        
        # Combine wait times into a single 2D grid matrix
        total_grid = sim.ns_wait + sim.ew_wait
        
        # Update the visual grid
        im.set_array(total_grid)
        return [im]

    # Run the animation loop
    # interval=200 means it updates every 200 milliseconds (5 frames per second)
    ani = animation.FuncAnimation(fig, update, frames=500, interval=200, blit=True)
    
    # Block and show the Window
    plt.show()

if __name__ == "__main__":
    run_live_simulation()
