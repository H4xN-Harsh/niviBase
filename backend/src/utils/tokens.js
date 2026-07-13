const jwt = require("jsonwebtoken");
const crypto = require('crypto');

function signAccessToken(user){
    return jwt.sign(
        {id:user._id},
        process.env.JWT_ACCESS_SECRET,
        {expiresIn:"20m"}
    )
}
function signRefreshToken(user){
    return jwt.sign(
        {id:user._id,},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn:"30d"}
    )
}

function hashToken(token){
    return crypto.createHash("sha256").update(token).digest("hex");
}
module.exports = {
    signAccessToken,
    signRefreshToken,
    hashToken
}