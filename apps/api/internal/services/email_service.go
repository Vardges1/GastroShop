package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	smtpFrom     string
	baseURL      string
}

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	BaseURL      string
}

func NewEmailService(config EmailConfig) *EmailService {
	return &EmailService{
		smtpHost:     config.SMTPHost,
		smtpPort:     config.SMTPPort,
		smtpUser:     config.SMTPUser,
		smtpPassword: config.SMTPPassword,
		smtpFrom:     config.SMTPFrom,
		baseURL:      config.BaseURL,
	}
}

func (s *EmailService) SendEmail(to, subject, body string) error {
	if s.smtpHost == "" || s.smtpPort == "" {
		log.Printf("SMTP not configured, skipping email to %s: %s", to, subject)
		return nil // Don't fail if SMTP is not configured (for development)
	}

	// Set default from email
	from := s.smtpFrom
	if from == "" {
		from = s.smtpUser
	}

	// Email headers
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	// Build email message
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	// SMTP authentication
	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	// Send email
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)
	err := smtp.SendMail(addr, auth, from, []string{to}, []byte(message))
	if err != nil {
		log.Printf("Failed to send email to %s: %v", to, err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("Email sent successfully to %s: %s", to, subject)
	return nil
}

// SendRegistrationEmail sends welcome email after registration
func (s *EmailService) SendRegistrationEmail(to, name string) error {
	subject := "Добро пожаловать в GastroShop!"

	data := map[string]interface{}{
		"Name":  name,
		"Email": to,
	}

	body, err := s.renderTemplate("registration_email", data)
	if err != nil {
		return err
	}

	return s.SendEmail(to, subject, body)
}

// SendVerificationEmail sends email verification link
func (s *EmailService) SendVerificationEmail(to, token string) error {
	subject := "Подтвердите ваш email адрес"

	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", s.baseURL, token)

	data := map[string]interface{}{
		"Email":           to,
		"VerificationURL": verificationURL,
		"Token":           token,
	}

	body, err := s.renderTemplate("verification_email", data)
	if err != nil {
		return err
	}

	return s.SendEmail(to, subject, body)
}

// SendPasswordResetEmail sends password reset link
func (s *EmailService) SendPasswordResetEmail(to, token string) error {
	subject := "Восстановление пароля"

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.baseURL, token)

	data := map[string]interface{}{
		"Email":    to,
		"ResetURL": resetURL,
		"Token":    token,
	}

	body, err := s.renderTemplate("password_reset_email", data)
	if err != nil {
		return err
	}

	return s.SendEmail(to, subject, body)
}

// SendOrderStatusEmail sends notification about order status change
func (s *EmailService) SendOrderStatusEmail(to string, orderID int, status string, items []map[string]interface{}, totalAmount int) error {
	subject := fmt.Sprintf("Статус вашего заказа #%d обновлен", orderID)

	statusText := map[string]string{
		"pending":    "Ожидает обработки",
		"processing": "В обработке",
		"paid":       "Оплачен",
		"shipped":    "Отправлен",
		"delivered":  "Доставлен",
		"canceled":   "Отменен",
	}

	data := map[string]interface{}{
		"OrderID":    orderID,
		"Status":     statusText[status],
		"StatusRaw":  status,
		"Items":      items,
		"TotalAmount": totalAmount,
	}

	body, err := s.renderTemplate("order_status_email", data)
	if err != nil {
		return err
	}

	return s.SendEmail(to, subject, body)
}

// SendPaymentNotificationEmail sends notification about payment status
func (s *EmailService) SendPaymentNotificationEmail(to string, orderID int, paymentID string, amount int, status string) error {
	subject := fmt.Sprintf("Платеж по заказу #%d", orderID)

	statusText := map[string]string{
		"awaiting_payment": "Ожидает оплаты",
		"paid":             "Оплачен",
		"canceled":         "Отменен",
		"failed":           "Не удался",
	}

	data := map[string]interface{}{
		"OrderID":    orderID,
		"PaymentID":  paymentID,
		"Amount":     amount,
		"Status":     statusText[status],
		"StatusRaw":  status,
	}

	body, err := s.renderTemplate("payment_notification_email", data)
	if err != nil {
		return err
	}

	return s.SendEmail(to, subject, body)
}

// renderTemplate renders email template
func (s *EmailService) renderTemplate(templateName string, data map[string]interface{}) (string, error) {
	templates := map[string]string{
		"registration_email": `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
		.content { padding: 20px; background: #f9f9f9; }
		.footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Добро пожаловать в GastroShop!</h1>
		</div>
		<div class="content">
			<p>Здравствуйте{{if .Name}}, {{.Name}}{{end}}!</p>
			<p>Спасибо за регистрацию в GastroShop. Мы рады приветствовать вас в нашем магазине гастрономических продуктов.</p>
			<p>Ваш email: <strong>{{.Email}}</strong></p>
			<p>Теперь вы можете:</p>
			<ul>
				<li>Просматривать наш каталог товаров</li>
				<li>Делать заказы</li>
				<li>Отслеживать статус заказов</li>
			</ul>
			<p>Приятных покупок!</p>
		</div>
		<div class="footer">
			<p>GastroShop - Ваш гастрономический магазин</p>
		</div>
	</div>
</body>
</html>
`,
		"verification_email": `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #2196F3; color: white; padding: 20px; text-align: center; }
		.content { padding: 20px; background: #f9f9f9; }
		.button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
		.footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Подтвердите ваш email</h1>
		</div>
		<div class="content">
			<p>Здравствуйте!</p>
			<p>Для завершения регистрации в GastroShop, пожалуйста, подтвердите ваш email адрес: <strong>{{.Email}}</strong></p>
			<p style="text-align: center;">
				<a href="{{.VerificationURL}}" class="button">Подтвердить email</a>
			</p>
			<p>Или скопируйте и вставьте эту ссылку в браузер:</p>
			<p style="word-break: break-all; color: #2196F3;">{{.VerificationURL}}</p>
			<p>Если вы не регистрировались в GastroShop, просто проигнорируйте это письмо.</p>
		</div>
		<div class="footer">
			<p>GastroShop - Ваш гастрономический магазин</p>
		</div>
	</div>
</body>
</html>
`,
		"password_reset_email": `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #FF9800; color: white; padding: 20px; text-align: center; }
		.content { padding: 20px; background: #f9f9f9; }
		.button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
		.footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
		.warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Восстановление пароля</h1>
		</div>
		<div class="content">
			<p>Здравствуйте!</p>
			<p>Вы запросили восстановление пароля для вашего аккаунта <strong>{{.Email}}</strong> в GastroShop.</p>
			<p style="text-align: center;">
				<a href="{{.ResetURL}}" class="button">Сбросить пароль</a>
			</p>
			<p>Или скопируйте и вставьте эту ссылку в браузер:</p>
			<p style="word-break: break-all; color: #2196F3;">{{.ResetURL}}</p>
			<div class="warning">
				<p><strong>Важно:</strong> Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется неизменным.</p>
				<p>Ссылка действительна в течение 24 часов.</p>
			</div>
		</div>
		<div class="footer">
			<p>GastroShop - Ваш гастрономический магазин</p>
		</div>
	</div>
</body>
</html>
`,
		"order_status_email": `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
		.content { padding: 20px; background: #f9f9f9; }
		.order-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
		.status { display: inline-block; padding: 5px 15px; background: #2196F3; color: white; border-radius: 3px; font-weight: bold; }
		.item { padding: 10px; border-bottom: 1px solid #eee; }
		.footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Статус заказа обновлен</h1>
		</div>
		<div class="content">
			<p>Здравствуйте!</p>
			<p>Статус вашего заказа <strong>#{{.OrderID}}</strong> был обновлен.</p>
			<div class="order-info">
				<p><strong>Новый статус:</strong> <span class="status">{{.Status}}</span></p>
				<p><strong>Номер заказа:</strong> #{{.OrderID}}</p>
			</div>
			{{if .Items}}
			<p><strong>Состав заказа:</strong></p>
			{{range .Items}}
			<div class="item">
				<p>{{.title}} - {{.quantity}} шт. × {{.price}} ₽</p>
			</div>
			{{end}}
			{{end}}
			{{if .TotalAmount}}
			<p><strong>Общая сумма:</strong> {{.TotalAmount}} ₽</p>
			{{end}}
			<p>Вы можете отслеживать статус заказа в личном кабинете.</p>
		</div>
		<div class="footer">
			<p>GastroShop - Ваш гастрономический магазин</p>
		</div>
	</div>
</body>
</html>
`,
		"payment_notification_email": `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
		.content { padding: 20px; background: #f9f9f9; }
		.payment-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
		.status { display: inline-block; padding: 5px 15px; background: #4CAF50; color: white; border-radius: 3px; font-weight: bold; }
		.footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Уведомление о платеже</h1>
		</div>
		<div class="content">
			<p>Здравствуйте!</p>
			<p>Информация о платеже по вашему заказу <strong>#{{.OrderID}}</strong>.</p>
			<div class="payment-info">
				<p><strong>Статус платежа:</strong> <span class="status">{{.Status}}</span></p>
				<p><strong>Номер заказа:</strong> #{{.OrderID}}</p>
				<p><strong>ID платежа:</strong> {{.PaymentID}}</p>
				<p><strong>Сумма:</strong> {{.Amount}} ₽</p>
			</div>
			{{if eq .StatusRaw "paid"}}
			<p>Платеж успешно обработан. Ваш заказ будет обработан в ближайшее время.</p>
			{{else if eq .StatusRaw "failed"}}
			<p>К сожалению, платеж не был обработан. Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.</p>
			{{end}}
		</div>
		<div class="footer">
			<p>GastroShop - Ваш гастрономический магазин</p>
		</div>
	</div>
</body>
</html>
`,
	}

	tmpl, exists := templates[templateName]
	if !exists {
		return "", fmt.Errorf("template %s not found", templateName)
	}

	t, err := template.New(templateName).Parse(tmpl)
	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return buf.String(), nil
}

// Helper to format currency
func formatCurrency(amountCents int) string {
	return fmt.Sprintf("%.2f", float64(amountCents)/100.0)
}

