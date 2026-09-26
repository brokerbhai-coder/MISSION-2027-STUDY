export const Difficulty = {
    // Generates difficulty parameters based on level (1 to 400)
    getParams(level) {
        // Base sizes
        let cols = Math.min(10 + Math.floor(level / 3), 40);
        let rows = Math.min(10 + Math.floor(level / 3), 40);
        
        // At higher levels, max out grid but increase complexity logic
        let complexityScore = Math.min(100, Math.floor(level / 4));
        let label = "EASY";
        if (level > 25) label = "MEDIUM";
        if (level > 45) label = "HARD";
        if (level > 65) label = "VERY HARD";
        if (level > 80) label = "BRUTAL";
        if (level > 100) label = "EXTREME";
        if (level > 200) label = "MASTER";
        if (level > 300) label = "NIGHTMARE";

        return {
            cols,
            rows,
            score: complexityScore,
            label,
            seed: 1337 + level // Deterministic seed
        };
    }
};
