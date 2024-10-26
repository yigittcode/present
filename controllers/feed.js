const validationResult = require("express-validator").validationResult;
const Post = require("../models/post");
const path = require("path");
const mongoose = require("mongoose");
const User = require('../models/user');

exports.getPosts = async(req, res, next) => {
  const page = req.query.page || 1;
  const itemCountOnPerPage = 4;
  const allPosts = await Post.find({})
    .skip((page - 1) * itemCountOnPerPage)
    .limit(itemCountOnPerPage)
    .populate('creator'); // 'creator' populates declaration with document 'User'

  const totalItemCount = await Post.countDocuments();
  res.status(200).json({
    posts : allPosts,
    totalItems : totalItemCount
  });
};

exports.createPost = async (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(422).json("Validation failed. Please try again.");
  }
  const title = req.body.title;
  const content = req.body.content;
  const imageUrl =
    `${req.protocol}://${req.get("host")}/` +
    path.posix.join("images", req.file.filename);
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId ,
  });
  try {
    await post.save();
    const targetUser = await User.findById(req.userId);
    targetUser.posts.push(post);
    await targetUser.save();
    // Create post in db
    res.status(201).json({
      message: "Post created successfully!",
      post: post,
    });
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

exports.getPost = async (req, res, next) => {
  const postID = req.params.postID;
  try {
    const postData = await Post.findById(postID);
    if (!postData) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json({ post: postData });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePost = async (req, res, next) => {
  const postID = req.params.postID;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res
      .status(422)
      .json({ message: "Validation failed. Please try again." });
  }

  const { title, content } = req.body;
  let imageUrl;

  if (req.file) {
    imageUrl =
      `${req.protocol}://${req.get("host")}/` +
      path.posix.join("images", req.file.filename);
  } else {
    // Retain the existing image URL if no new image is provided
    const existingPost = await Post.findById(postID);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    imageUrl = existingPost.imageUrl;
  }

  try {
    const post = await Post.findById(postID);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to edit this post" });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postID,
      { title, content, imageUrl },
      { new: true } // Ensure it returns the updated document
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Update successful", post: updatedPost });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deletePost = async (req, res, next) => {
  const postID = req.params.postID;
  try {
    const post = await Post.findById(postID);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(postID);

    // Remove the post from the user's posts array
    await User.findByIdAndUpdate(req.userId, {
      $pull: { posts: postID }
    });
    const page = parseInt(req.query.page) || 1;
    const itemCountOnPerPage = 4;
    
    res.status(200).json({ message: "Deleting process is successful", redirectPage: page });
  
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

