const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    githubId:{type:String, required:true,unique:true},
    username:{
        type:String,
        required:true
    },
    displayName:{
        type:String,
        required:true
    },
    avatarUrl:{
        type:String,
        required:true
    },
    refreshTokens:[
        {
            _id:false,
            tokenHash:{type:String,required:true},
            expiresAt:{type:Date,required:true}
        }
    ]
    
},{timestamps:true});

module.exports = mongoose.model("User",userSchema);
