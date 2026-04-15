import random

class RouteOptimizerGA:
    def __init__(self, grid, start=(0,0), end=(9,9), pop_size=30, generations=50):
        """
        Genetic Algorithm to find the fastest route across the city.
        Navigates across the grid avoiding areas of high traffic.
        """
        self.grid = grid
        self.start = start
        self.end = end
        self.pop_size = pop_size
        self.generations = generations
        
        # Number of fixed directional moves needed to safely reach the destination
        # 0 = Move Right (East), 1 = Move Down (South)
        self.num_right = end[0] - start[0]
        self.num_down = end[1] - start[1]
        
    def initialize_population(self):
        """
        Creates the starting generation of random path chromosomes.
        """
        pop = []
        for _ in range(self.pop_size):
            chromosome = [0]*self.num_right + [1]*self.num_down
            random.shuffle(chromosome)
            pop.append(chromosome)
        return pop
        
    def fitness(self, chromosome):
        """
        Calculates route's score. 
        High traffic on nodes = Low fitness.
        """
        x, y = self.start
        total_congestion = self.grid[x, y]
        
        # Trace the path on the grid
        for move in chromosome:
            if move == 0:
                x += 1
            else:
                y += 1
            total_congestion += self.grid[x, y]
            
        # Fitness is heavily inversely proportional to the congestion encountered
        return 1.0 / (total_congestion + 1)
        
    def mutate(self, chromosome, rate=0.2):
        """
        Mutation: swap two steps to discover alternate paths 
        (e.g., swapping a Right move with a Down move).
        """
        if random.random() < rate:
            idx0 = [i for i, x in enumerate(chromosome) if x == 0]
            idx1 = [i for i, x in enumerate(chromosome) if x == 1]
            if idx0 and idx1:
                i, j = random.choice(idx0), random.choice(idx1)
                # Swap the directions
                chromosome[i], chromosome[j] = chromosome[j], chromosome[i]
        return chromosome
        
    def run(self):
        """
        Main Loop: Evolution across generations.
        """
        population = self.initialize_population()
        best_fitnesses = []
        best_route = None
        max_fit = -1
        
        for _ in range(self.generations):
            fitnesses = [self.fitness(ind) for ind in population]
            
            # Track the best performer in the current generation
            best_gen_fit = max(fitnesses)
            best_fitnesses.append(best_gen_fit)
            best_idx = fitnesses.index(best_gen_fit)
            
            if best_gen_fit > max_fit:
                max_fit = best_gen_fit
                best_route = population[best_idx]
                
            new_pop = []
            
            # Elitism: Make sure the undisputed best route always survives
            new_pop.append(list(best_route)) 
            
            # Generate the rest of the new population
            while len(new_pop) < self.pop_size:
                # Tournament Selection Algorithm
                contenders = random.sample(list(zip(population, fitnesses)), 3)
                winner = max(contenders, key=lambda c: c[1])[0]
                
                # Breed and Mutate
                child = self.mutate(list(winner), rate=0.3)
                new_pop.append(child)
                
            population = new_pop
            
        return best_route, best_fitnesses
