const router = require("express").Router();

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

router.patch("/update-me", authController.protect, userController.updateMe); //to update the user profile after checking if the user logged in

router.get("/get-users", authController.protect, userController.getUsers); //to get all the users

router.get("/get-friends", authController.protect, userController.getFriends); //to get all the friends

router.get("/get-friend-requests", authController.protect, userController.getRequest); //to get all friend requests

module.exports = router;
