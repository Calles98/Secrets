//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { nextTick } = require("process");
const { log } = require("console");
 
const app = express();
 
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
 
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);
 
app.use(passport.initialize());
app.use(passport.session());
 
mongoose.set("strictQuery", true);
 
mongoose.connect(
  "mongodb://127.0.0.1:27017/userDB",
  {
    useNewUrlParser: true,
  },
  console.log("connected to mongoDB")
);
 
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});
 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
 
const User = new mongoose.model("User", userSchema);
 
passport.use(User.createStrategy());
 
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});
 
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
 
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
 
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
 
      User.findOne({googleId: profile.id})
        .then((founduser)=>{
            if(!founduser){  //if no foundUser , we create one
            const newUser = new User({
                username: profile.displayName,
                googleId: profile.id
            })
            newUser.save() //save the User and then send back the newly created user
            .then(() => {
                cb(null, newUser)
            })
            .catch((err)=>{
                cb(err)
            })
            } else { //if user already exist, just send back the user
            cb(null, founduser)
            }
        })
        .catch((err)=>{
            cb(err)
        })
    }
));

 
app.get("/", function (req, res) {
  res.render("home");
});
 
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
 
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);
 
app.get("/login", function (req, res) {
  res.render("login");
});
 
app.get("/register", function (req, res) {
  res.render("register");
});
 
app.get("/secrets", async function (req, res) {
    const foundUsers = await User.find({"secret": {$ne: null}}); 
    try {
        res.render("secrets", {usersWithSecret: foundUsers})
    } catch (err) {
        console.log(err);
    }
});

app.get("/submit", (req, res)=>{
    if (req.isAuthenticated()) {
        res.render("submit");
      } else {
        res.redirect("/login");
      }
}); 
 
app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return nextTick(err);
    }
    res.redirect("/");
  });
});
 
app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});
 
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
 
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", async (req,res)=>{
    const submittedSecret = req.body.secret; 

    const foundUser = await User.findById(req.user.id); 
    try {
        foundUser.secret = submittedSecret; 
        const savedData = await foundUser.save(); 
        res.redirect("/secrets"); 
    } catch (err) {
        console.log(err);
    }
               
}); 
 
app.listen("3000", function () {
  console.log("Connected at port 3000");
});