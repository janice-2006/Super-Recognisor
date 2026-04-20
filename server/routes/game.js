const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route    GET api/game/test
// @desc     Test the game route functionality
// @access   Public
router.get('/test', (req, res) => {
    res.status(200).send('Game Route is working! ✅');
});

// @route    PUT api/game/attempt
// @desc     Submit a new game attempt and update stats
// @access   Private
router.put('/attempt', auth, async (req, res) => {
    const { level, score, accuracy, reactionTime } = req.body;

    try {
        let user = await User.findById(req.user.id);

        // Add to attempts history
        user.attempts.push({
            level,
            score,
            accuracy,
            reactionTime
        });

        // Update global stats
        user.stats.totalAttempts += 1;
        if (score > user.stats.bestScore) {
            user.stats.bestScore = score;
        }

        await user.save();

        // Return the expected stats
        res.json({
            totalAttempts: user.stats.totalAttempts,
            bestScore: user.stats.bestScore
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;