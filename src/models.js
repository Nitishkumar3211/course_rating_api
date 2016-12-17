'use strict';

var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fve = require('./formatValidationErrors');


/* REVIEW MODEL */

// setup reviews
var reviewSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  postedOn: Date,
  rating: {
    type: Number,
    required: [true, 'A rating is required.'],
    min: [1, 'A minimum rating of "1" is required.'],
    max: [5, '"5" is the maximum rating.']
  },
  review: String
});

// Round entered rating to nearest integer before saving to db.
reviewSchema.pre('save', function(next) {
  Math.round(this.rating);
  next();
});



/* USER MODEL */

// setup users
var userSchema = new Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required.'],
    trim: true
  },
  emailAddress: {
    type: String,
    required: [true, 'An email address is required.'],
    unique: true,
    trim: true,

    // Custom validation for email format.
    validate: {
      validator: function(email) {
        return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
      },
      message: 'Email address must be in a valid format.'
    }
  },
  password: String,
  confirmPassword: String
});

// Validate middleware compares the two password fields
userSchema.pre('validate', function(next) {
  if (this.password !== this.confirmPassword) {

    // Manually invalidate password field if they don't match.
    this.invalidate('password', 'Passwords must match.');
    next();

    // If they match, continue.
  } else {
    next();
  }
});

// Hash passwords before saving to db.
userSchema.pre('save', function(next) {
  var user = this;

  // First hash the password field.
  bcrypt.hash(user.password, 10, function(err, hash) {
    if (err) {
      return next(err);
    }
    user.password = hash;

    // Then hash the confirmPassword field.
    bcrypt.hash(user.confirmPassword, 10, function(err, hash) {
      if (err) {
        return next(err);
      }
      user.confirmPassword = hash;

      // Call next() when both passwords are hashed.
      next();
    });
  });
});



/* COURSE MODEL */

// setup courses
var courseSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: [true, 'A title is required.']
  },
  description: {
    type: String,
    required: [true, 'A description is required.']
  },
  estimatedTime: String,
  materialsNeeded: String,
  steps: {
    type: [{
      stepNumber: Number,
      title: {
        type: String,
        required: [true, 'Step must have a title.']
      },
      description: {
        type: String,
        required: [true, 'Step must have a description.']
      }
    }],
    required: [true, 'At least one step is required.']
  },
  reviews: [{
    type: Schema.Types.ObjectId,
    ref: 'Review'
  }]
});

// Create virtual overallRating field in courses.
courseSchema.virtual('overallRating').get(function() {
  var ratingsTotal = 0;
  var result = 0;
  if (this.reviews) {
    for (var i = 0; i < this.reviews.length; i++) {
      ratingsTotal += this.reviews[i].rating;
    }
    result = Math.round(ratingsTotal / this.reviews.length);
  }
  return result;
});

// Set the overalRating virtual field to be sent with json. Default is off.
courseSchema.set('toJSON', {
  virtuals: true
});



var Review = mongoose.model('Review', reviewSchema);
var User = mongoose.model('User', userSchema);
var Course = mongoose.model('Course', courseSchema);

module.exports.Review = Review;
module.exports.User = User;
module.exports.Course = Course;