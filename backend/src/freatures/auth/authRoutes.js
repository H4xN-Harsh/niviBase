const express = require('express');
const axios = require('axios');
const User = require('../../freatures/auth/authModel');
const {signAccessToken,signRefreshToken,hashToken} = require('../../utils/tokens');
const router = express.Router();
const REFRESH_COOKIE_OPTS={
    httpOnly:true,//prevent from document.cookie
    secure:process.env.NODE_ENV==="production",//this means cookies only sent over https not on the http
    sameSite:"lax",//this protect from csrf 
    path:"/api/auth/refresh",
    maxAge:30 * 24 * 60 * 60 * 1000,//this is the age of refresh token
}

const ACCESS_TOKEN_OPTS={
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    maxAge:20*60*1000//20mins
}

async function issueToken(res,user){
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokens=user.refreshTokens.filter(ft=>ft.expiresAt>new Date());
    user.refreshTokens.push({
        tokenHash:hashToken(refreshToken),
        expiresAt:new Date(Date.now()+30*24* 60 * 60 * 1000)
    });
    
    await user.save();
    res.cookie('accessToken',accessToken,ACCESS_TOKEN_OPTS);
    res.cookie('refreshToken',refreshToken,REFRESH_COOKIE_OPTS);
}
// redirect to gitHub
router.get("/github",(req,res)=>{
    const params = new URLSearchParams({
        client_id:process.env.GITHUB_CLIENT_ID,
        redirect_uri:process.env.GITHUB_CALLBACK_URL,
        scope:"read:user",
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
})

// getting callback
router.get("/github/callback",async(req,res)=>{
    const {code} = req.query;
    if(!code)return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);
    try{
        const tokenRes = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id:process.env.GITHUB_CLIENT_ID,
                client_secret:process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri:process.env.GITHUB_CALLBACK_URL
            },{
                headers:{Accept:'application/json'}
            }
        );
        const githubAccessToken = tokenRes.data.access_token;//might get an error on access_token
        if(!githubAccessToken){
            return res.redirect(`${process.env.CLIENT_URL}/login?error=token_failed`);
        }
        const profilesRes = await axios.get('https://api.github.com/user',{
            headers:{Authorization:`Bearer ${githubAccessToken}`}
        });
        const profile = profilesRes.data;
        let user = await User.findOne({githubId:String(profile.id)});
        if(!user){
            user=await User.create({
                githubId:String(profile.id),
                username:profile.login,
                displayName:profile.name||profile.login,
                avatarUrl:profile.avatar_url,
                refreshTokens:[]
            })
        }
        user.username = profile.login;
        user.displayName = profile.name || profile.login;
        user.avatarUrl = profile.avatar_url;
        await issueToken(res,user);
        res.redirect(`${process.env.CLIENT_URL}/dashboard`);

    }catch(err){
        console.error(err.response?.data||err.message);
        res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
});
module.exports = router;