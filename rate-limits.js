let rateLimits = new Map();

setInterval(() => {
    const now = Date.now()
    rateLimits.forEach (function(value, key) {
        limit = value;

        if (now - limit.windowStart > 60000) {
            rateLimits.delete(key);
            console.log("Deleted rate limit:", key);
        }
    })
}, 60000) // clean up every minute

const canSendMessage = (token) => {
    try {
        const nowTime = Date.now()
        const limit = rateLimits.get(token)

        console.log("Time:", nowTime);
        console.log("Token limit info:", limit);

        if(limit === null || limit === undefined){
            rateLimits.set(token, { count: 1, windowStart: nowTime })
            console.log("Added rateLimit to token")
            return true;
        }

        // Reset window every 10 seconds
        if (nowTime - limit.windowStart > 10000) {
            rateLimits.set(token, { count: 1, windowStart: nowTime })
            console.log("Reset limit")
            return true
        }

        if (limit.count >= 5){
            console.log("Count limit was too much:", limit.count)
            return false // max 5 messages per 10 seconds
        } 

        rateLimits.set(token, { count: limit.count + 1, windowStart: nowTime })
        console.log("Updated rate limit for", token);
        return true
    } catch (error) {
        console.error("Error when trying to add rate limit:", error.message);
        throw error;
    }
};

module.exports = {
    canSendMessage
};