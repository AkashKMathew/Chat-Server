const router = require("express").Router();

const userController = require("../controllers/user");
const authController = require("../controllers/auth");

router.patch("/update-me", authController.protect, userController.updateMe); //to update the user profile after checking if the user logged in

router.post("/get-users", authController.protect, userController.getUsers); //to get all the users

router.post("/get-friends", authController.protect, userController.getFriends); //to get all the friends

router.post("/get-friend-requests", authController.protect, userController.getRequest); //to get all friend requests

module.exports = router;
