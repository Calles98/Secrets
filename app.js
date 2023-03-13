//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");  


mongoose.set("strictQuery", false);
mongoose.connect("mongodb://localhost:27017/userDB", {UseNewUrlParser: true}); 

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

// USER SCHEMA

const userSchema = new mongoose.Schema({
    email: String, 
    password: String
});


userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']}); 

const User = mongoose.model("User", userSchema); 

// HTTP requests

app.get("/", (req,res)=>{
    res.render("home"); 
});

app.get("/register", (req,res)=>{
    res.render("register"); 
});

app.get("/login", (req,res)=>{
    res.render("login"); 
});

app.post("/register", async (req,res)=>{
    const newUser = new User({email: req.body.username, password: req.body.password});
    try {
        
        await newUser.save(); 
        res.render("Secrets"); 
        
    } catch (error) {
        console.log(error); 
        
    }
}); 

app.post("/login", async(req,res)=>{
    const username = req.body.username; 
    const password = req.body.password; 
    try {
       const foundUser = await User.findOne({email: username}); 
        if(foundUser){
            if(foundUser.password === password){
                res.render("secrets");
            } else{
                res.render("register"); 
            } 
        }else{
            res.render("register")
        }
    } catch (error) {
        console.log(error);
    }
}); 


app.listen(3000, ()=>{
    console.log("Listening on port 3000...");
});