const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

/**
 * @name registerUserController
 * @description Controller function to handle user registration,register a new user
 * @access Public 
 */

async function registerUserController(req, res) {

    const {username , email , password} = req.body
    if(!username || !email || !password){
        return res.status(400).json({
            message: "Please provide username,email and password"
        })
    }

    const isUserAlreadyExits = await userModel.findOne({
        $or:[{username},{email}]
    })
    if(isUserAlreadyExits){
        /** isUserAlreadyExists */
        return res.status(400).json({
            message:"Account is already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password,10)

    const user = await userModel.create({
        username,
        email,
        password:hash 
    })

    const token = jwt.sign(
        {
            id: user._id, username: user.username

        },
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )

    res.cookie("token",token)
    res.status(201).json({
        message: "user registered succesfully",
        user:{
          id: user._id, 
          username: user.username,
          email:user.email
        }
    })

}

/**
 * @name loginUserController
 * @description login a user, expect email and password in the request in thr request body
 * @access public
 */

async function loginUserController(req,res){
    const {email,password} = req.body

    const user = await userModel.findOne({email})

    if(!user){
        return res.status(400).json({
            message:"Invalid email or password"

        })
    }

    const isPassWordValid = await bcrypt.compare(password,user.password)
    if(!isPassWordValid){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }


    const token = jwt.sign(
        {
            id: user._id, username: user.username

        },
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )

    res.cookie("token",token)
    res.status(200).json({
        message:"User loggedin successfully",
        user : {
            id:user._id,
            username: user.username,
            email:user.email
        }
    })

}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */


async function logoutUserController(req,res){
    const token = req.cookies.token

    if(token){
        await tokenBlacklistModel.create({token})
    }

    res.clearCookie("token")
    res.status(200).json({
        message: "user logged out successfully"
    })

}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */

async function getMeController(req,res){
    const user = await userModel.findById(req.user.id)
    res.status(200).json({
        message:"user details fetch succesfully",
        user:{
            id: user._id,
            username: user.username,
            email:user.email
        }
    })

}

module.exports = { registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
 };
