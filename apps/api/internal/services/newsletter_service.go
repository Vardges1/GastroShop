package services

import (
	"gastroshop-api/internal/repository"
)

type NewsletterService struct {
	newsletterRepo *repository.NewsletterRepository
}

func NewNewsletterService(newsletterRepo *repository.NewsletterRepository) *NewsletterService {
	return &NewsletterService{
		newsletterRepo: newsletterRepo,
	}
}

func (s *NewsletterService) Subscribe(email string) error {
	return s.newsletterRepo.Subscribe(email)
}

func (s *NewsletterService) Unsubscribe(email string) error {
	return s.newsletterRepo.Unsubscribe(email)
}

func (s *NewsletterService) IsSubscribed(email string) (bool, error) {
	return s.newsletterRepo.IsSubscribed(email)
}

func (s *NewsletterService) GetSubscription(email string) error {
	_, err := s.newsletterRepo.GetSubscription(email)
	return err
}

