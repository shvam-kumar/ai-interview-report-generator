const express = require("express");
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const authRouter = express.Router();
/**\
 * @route POST /api/auth/register
 * @description: Register a new user
 * @access Public
 * @body {username, email, password}
 */

authRouter.post("/register", authController.registerUserController );

/**
 * @routes POST/api/auth/login 
 * @description login user with email and password 
 * @access Public
 */

authRouter.post("/login",authController.loginUserController)

/**
 * @route GET/api/auth/logout
 * @description clear token from uses cookie and add the token in the blacklist
 * @access public
 */
authRouter.get("/logout",authController.logoutUserController)

/**
 * @route GET/api/auth/get-me
 * @description get the current logges in the user details
 * @access private
 */
authRouter.get("/get-me",authMiddleware.authUser,authController.getMeController)

module.exports = authRouter;