import numpy as np

class QLearningAgent:
    def __init__(self, state_size, action_size, learning_rate=0.1, discount_factor=0.9, epsilon=1.0):
        """
        Q-Learning Agent to dynamically optimize traffic signals.
        """
        # Initialize Q-table with zeros: State dimensions + Action Dimension
        self.q_table = np.zeros(state_size + (action_size,))
        self.lr = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon # Starts high for exploration
        self.action_size = action_size
        self.model_loaded = False

    def simulate_trained_model(self, seed=42):
        """
        Simulates loading a pre-trained policy by seeding and filling Q-table
        with stable directional preferences.
        """
        rng = np.random.default_rng(seed)
        self.q_table = rng.normal(loc=0.0, scale=0.15, size=self.q_table.shape)

        # Strong preference: choose NS when NS backlog category is higher, else EW.
        for ns_idx in range(self.q_table.shape[0]):
            for ew_idx in range(self.q_table.shape[1]):
                if ns_idx >= ew_idx:
                    self.q_table[ns_idx, ew_idx, 0] += 0.65
                else:
                    self.q_table[ns_idx, ew_idx, 1] += 0.65

        self.epsilon = 0.0
        self.model_loaded = True
        
    def choose_action(self, state):
        """
        Choose whether to show Green on North/South or Green on East/West.
        Uses Epsilon-greedy action selection.
        """
        if np.random.uniform(0, 1) < self.epsilon:
            # Explore: Randomly pick an action
            return np.random.choice(self.action_size)
        # Exploit: Pick the best learned action from the Q-table
        return np.argmax(self.q_table[state])

    def predict(self, state):
        """
        Inference path for live traffic control. No exploration.
        """
        return int(np.argmax(self.q_table[state]))
        
    def learn(self, state, action, reward, next_state):
        """
        Update the Q-table based on the observed reward (Bellman equation).
        """
        best_next_action = np.argmax(self.q_table[next_state])
        
        # Calculate Target and Error
        td_target = reward + self.gamma * self.q_table[next_state][best_next_action]
        td_error = td_target - self.q_table[state][action]
        
        # Adjust the Q-value
        self.q_table[state][action] += self.lr * td_error
