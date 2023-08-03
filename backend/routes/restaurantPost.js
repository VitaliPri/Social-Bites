const express = require("express");
const router = express.Router();
const { Restaurant, Post, Comment, sequelize, Tag, UserTag, PostTag} = require("../models");
const { autheticateUser } = require("../middleware/authUser");
const { userAllowPostion } = require("../middleware/userAllowPostion");
const { Op,QueryTypes } = require("sequelize");


// get all post of a restaurant in the db based on their restaurantId
router.get("/:restaurantId", async (req, res)=>{
    const restaurantId = parseInt(req.params.restaurantId, 10);
    try{
        const restaurants = await Post.findAll({
            where: {
                RestaurantId: restaurantId
            }
        });

        return res.status(200).json(restaurants);

    }catch(error){
        const errorMessage = error.message;
        return res.status(500).json({
            message: "An error occured when fetching for restaurants",
            error: errorMessage
        })
    }
});

// add all the tags attached to the post onto the post_tag table
async function addPostTagsToTable(newPost, tagList, res){
    try{
        // make sure all tags are inside the Tag table and return it to insertedTag
        const insertedTags = await Promise.all(
            tagList.map((tagName) => {
                return Tag.findOrCreate({ where: { tag: tagName } });
            })
        );   

        // Get the tagIds from insertedTags
        const tagIds = insertedTags.map((insertedTag) => insertedTag[0].id);

        if (tagIds.length === 0) {
            console.log("No tags to insert.");
            return;
          }
        
        // Execute the SQL query to insert into post_tag table
        // unnest function can create numbers of rows for tagIds if given a list
        await sequelize.query(
            `
            INSERT INTO post_tag ("PostId", "TagId")
            SELECT :postId, t.id
            FROM unnest(ARRAY[:tagIds]) AS t(id)
            `,
            {
              replacements: { postId: newPost.id, tagIds: tagIds },
              type: QueryTypes.INSERT,
            }
          );
    
    }catch(error){
        console.error("Error in addPostTagsToTable:", error);
        throw error;
    }
}

// post a post for a restaurant, the user must be the restaurant owner && logged in
router.post("/:restaurantId", autheticateUser, async(req, res)=>{
    const restauarantId = parseInt(req.params.restaurantId, 10);

    try{

        // fetch inside Restaurant table, if the UserId is equal to logged in userId
        const restauarant = await Restaurant.findOne({
            where: {
                id: restauarantId, 
            }
        });

        if (!restauarant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }
        if (restauarant.UserId !== parseInt(req.session.userId,10)){
            return res.status(403).json({ message: "You are not the owner of the restaurant. Access denied" });
        }

        // create a post in the Post table
        const post = await Post.create({
            UserId: parseInt(req.session.userId,10),
            RestaurantId: restauarantId,
            postTitle: req.body.postTitle,
            postContent: req.body.postContent
        });

        // add all post into the post_tag table
        await addPostTagsToTable(post, req.body.tags, res);

        return res.status(201).json({
            message: "The post is created successfully",
            postTitle: post.postTitle
        });

    }catch(error){
        const errorMessage = error.message;
        const errorStack = error.stack;
        return res.status(500).json({
            message: "An error occured while creating a post",
            error: errorMessage
        });
    }
});

//post a comment onto a restaurant post
router.post("/:restaurantId/:postId/comment", autheticateUser, async(req, res)=>{
    const restaurantId = parseInt(req.params.restaurantId,10);
    const postId = parseInt(req.params.postId,10);

    try{
        // fetch for the postId and restaurantId to see if they exist
        const post = await Post.findOne({where: {id: postId, RestaurantId: restaurantId}});

        // if post exist, create a new comment
        if (post){
            const newComment = await Comment.create({
                UserId: parseInt(req.session.userId,10),
                PostId: postId,
                content: req.body.content
            });

            return res.status(201).json({
                message: "The comment is created successfully",
                content: newComment.content
            });
        }
        else{
            return res.status(404).json({message: "Post Not Found"});
        }

    }catch(error){
        const errorMessage = error.message;
        return res.status(500).json({
            message: "An error occured while creating a post",
            error: errorMessage
        });
    }
});

//get all comment of a restaurant post
router.get("/:postId/comment", async(req, res)=>{
    const postId = parseInt(req.params.postId,10);

    try{
        // fetch for the postId and restaurantId to see if they exist
        const comments = await Comment.findAll({where: {PostId: postId}});

        // if post exist, create a new comment
        if (comments.length > 0){

            return res.status(200).json(comments);
        }
        else{
            return res.status(404).json({message: "No Comments Found"});
        }

    }catch(error){
        const errorMessage = error.message;
        return res.status(500).json({
            message: "An error occured while creating a post",
            error: errorMessage
        });
    }
});

// get all post nearby restaurant post, if user allowed share location
router.get("/user/nearby_post/:radiusKm", userAllowPostion, async(req,res)=>{
    // get the list of restaurant near the user, and allow user to choose the radiusKm
    const radiusMeters = parseFloat(req.params.radiusKm) * 1000;
    const userLatitude = parseFloat(req.session.userLocation.latitude);
    const userLongitude = parseFloat(req.session.userLocation.longitude);
    
    try{
        // use sequelize.query to select from the database using extension of earth_distance
        const nearbyRestaurants = await sequelize.query(
            `
            SELECT id FROM "restaurant"
            WHERE earth_box(ll_to_earth(?, ?), ?) @> ll_to_earth("latitude", "longitude")
            `,
            {
                replacements: [userLatitude, userLongitude, radiusMeters], // replacement for the question marks
                type: QueryTypes.SELECT
            },
        );

        // got the list of the nearby Restaurants
        if (nearbyRestaurants.length > 0) {
            const nearbyRestaurantList = nearbyRestaurants.map(restaurant => restaurant.id);
            const postOfNearbyRestaurants = await Post.findAll({
                where: {
                RestaurantId: {
                    [Op.in]: nearbyRestaurantList,
                },
                },
            });

          return res.status(200).json(postOfNearbyRestaurants)
        } else {
          return res.status(404).json({ message: "No restaurant nearby" });
        }
    } catch(error){
        const errorMessage = error.message;
        return res.status(500).json({message: "An error occured when fetching for restaurants", error: errorMessage});
    }

});

// get all post that are associated with user's interest
router.get("/user/interested_post", autheticateUser, async(req,res)=>{    
    try{
        // get all user's interested tags
        const userInterestedTags = await UserTag.findAll({where: {UserId: parseInt(req.session.userId,10)}});
        const userInterestedTagId = userInterestedTags.map((element) => {return element.TagId});

        // if not interested in any tag, return 404
        if (userInterestedTagId.length === 0){
            return res.status(404).json({message: "No Tags Inerested"});
        }

        console.log("userTAG!!!!!!" + userInterestedTagId);

        const userInterestedPosts = await sequelize.query(
            `
            SELECT *
            FROM post_tag
            WHERE "TagId" = ANY(:userInterestedTagId)::integer[];
            `,
            {
                replacements: { userInterestedTagId: userInterestedTagId },
                type: QueryTypes.SELECT
            }
        );
        
        return res.status(200).json(userInterestedPosts);

        // Look for Post that user is interested in based on the userInterestedTags
        // const userInterestedPosts = await PostTag.findAll({
        //     where: {
        //         TagId: {
        //             [Op.in]: userInterestedTagId
        //         }
        //     }
        // });
    //     const userInterestedPostsId = userInterestedPosts.map((element) => {return element.PostId});


    //     // Use the PostId to find the post inside "post" table
    //     const posts = await Post.findAll({
    //         where: {
    //             id: {
    //                 [Op.in]: userInterestedPostsId
    //             }
    //         }
    //     });

    //     if (posts.length === 0){
    //         return res.status(404).json({message: "No Post Inerested"});
    //     }
    //     else{
    //         return res.status(200).json(posts);
    //     }
    } catch(error){
        const errorMessage = error.message;
        return res.status(500).json({message: "An error occured when fetching for restaurants", error: error.stack, errorMessage: error.message});
    }

});


// get all restaurants' post in the db, notes: user_post won't be in here!!
router.get("/", async (req, res)=>{
    try{
        const posts = await Post.findAll({
            where: {
                RestaurantId: {
                    [Op.ne]: null,
                  },
            },
        });
        return res.status(200).json(posts);
    }catch(error){
        const errorMessage = error.message;
        return res.status(500).json({
            message: "An error occured when fetching for posts",
            error: errorMessage
        });
    }
});


module.exports = router;