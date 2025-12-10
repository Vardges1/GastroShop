package services

import (
	"errors"
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type ReviewService struct {
	reviewRepo  *repository.ReviewRepository
	productRepo *repository.ProductRepository
}

func NewReviewService(reviewRepo *repository.ReviewRepository, productRepo *repository.ProductRepository) *ReviewService {
	return &ReviewService{
		reviewRepo:  reviewRepo,
		productRepo: productRepo,
	}
}

// CreateReview creates a new review for a product
func (s *ReviewService) CreateReview(userID int, req *models.CreateReviewRequest) (*models.Review, error) {
	// Validate product exists
	product, err := s.productRepo.GetProductByID(req.ProductID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, errors.New("product not found")
	}

	// Check if user already reviewed this product
	hasReviewed, err := s.reviewRepo.HasUserReviewedProduct(req.ProductID, userID)
	if err != nil {
		return nil, err
	}
	if hasReviewed {
		return nil, errors.New("you have already reviewed this product")
	}

	// Validate rating
	if req.Rating < 1 || req.Rating > 5 {
		return nil, errors.New("rating must be between 1 and 5")
	}

	// Validate comment
	if req.Comment == "" {
		return nil, errors.New("comment is required")
	}

	review := &models.Review{
		ProductID: req.ProductID,
		UserID:    userID,
		Rating:    req.Rating,
		Title:     req.Title,
		Comment:   req.Comment,
		Photos:    req.Photos,
		Approved:  false, // Requires moderation by default
		Moderated: false,
	}

	if err := s.reviewRepo.CreateReview(review); err != nil {
		return nil, err
	}

	return review, nil
}

// GetReviewsByProductID returns all approved reviews for a product
func (s *ReviewService) GetReviewsByProductID(productID int, userID *int, onlyApproved bool) ([]models.Review, error) {
	reviews, err := s.reviewRepo.GetReviewsByProductID(productID, userID, onlyApproved)
	if err != nil {
		return nil, err
	}
	return reviews, nil
}

// GetReviewByID returns a review by ID
func (s *ReviewService) GetReviewByID(id int) (*models.Review, error) {
	review, err := s.reviewRepo.GetReviewByID(id)
	if err != nil {
		return nil, err
	}
	return review, nil
}

// GetReviewsByUserID returns all reviews by a user
func (s *ReviewService) GetReviewsByUserID(userID int) ([]models.Review, error) {
	reviews, err := s.reviewRepo.GetReviewsByUserID(userID)
	if err != nil {
		return nil, err
	}
	return reviews, nil
}

// UpdateReview allows a user to update their own review
func (s *ReviewService) UpdateReview(reviewID, userID int, req *models.UpdateReviewRequest) (*models.Review, error) {
	// Get existing review
	review, err := s.reviewRepo.GetReviewByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	// Check if user owns this review
	if review.UserID != userID {
		return nil, errors.New("you can only update your own reviews")
	}

	// Update fields if provided
	if req.Rating != nil {
		if *req.Rating < 1 || *req.Rating > 5 {
			return nil, errors.New("rating must be between 1 and 5")
		}
		review.Rating = *req.Rating
	}
	if req.Title != nil {
		review.Title = *req.Title
	}
	if req.Comment != nil {
		if *req.Comment == "" {
			return nil, errors.New("comment cannot be empty")
		}
		review.Comment = *req.Comment
	}
	if req.Photos != nil {
		review.Photos = req.Photos
	}

	// Reset approval status when review is updated
	review.Approved = false
	review.Moderated = false

	if err := s.reviewRepo.UpdateReview(reviewID, review); err != nil {
		return nil, err
	}

	return review, nil
}

// DeleteReview allows a user to delete their own review
func (s *ReviewService) DeleteReview(reviewID, userID int) error {
	review, err := s.reviewRepo.GetReviewByID(reviewID)
	if err != nil {
		return err
	}
	if review == nil {
		return errors.New("review not found")
	}

	// Check if user owns this review
	if review.UserID != userID {
		return errors.New("you can only delete your own reviews")
	}

	return s.reviewRepo.DeleteReview(reviewID)
}

// ToggleHelpful toggles the helpful vote for a review
func (s *ReviewService) ToggleHelpful(reviewID, userID int) (bool, error) {
	// Check if review exists
	review, err := s.reviewRepo.GetReviewByID(reviewID)
	if err != nil {
		return false, err
	}
	if review == nil {
		return false, errors.New("review not found")
	}

	// User cannot vote on their own review
	if review.UserID == userID {
		return false, errors.New("you cannot vote on your own review")
	}

	return s.reviewRepo.ToggleHelpful(reviewID, userID)
}

// GetAverageRating returns the average rating and count for a product
func (s *ReviewService) GetAverageRating(productID int) (float64, int, error) {
	return s.reviewRepo.GetAverageRating(productID)
}

// Admin methods

// GetAllReviews returns all reviews (for admin moderation)
func (s *ReviewService) GetAllReviews(onlyPending bool) ([]models.Review, error) {
	return s.reviewRepo.GetAllReviews(onlyPending)
}

// ModerateReview allows admin to approve/reject a review
func (s *ReviewService) ModerateReview(reviewID int, approved bool, notes string) error {
	review, err := s.reviewRepo.GetReviewByID(reviewID)
	if err != nil {
		return err
	}
	if review == nil {
		return errors.New("review not found")
	}

	return s.reviewRepo.ModerateReview(reviewID, approved, notes)
}










