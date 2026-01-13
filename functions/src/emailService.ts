import {Resend} from "resend";
import * as logger from "firebase-functions/logger";

// Initialize Resend with API key from environment
// Handle missing API key gracefully for development/testing
let resend: Resend | null = null;

try {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "your_resend_api_key_here") {
    resend = new Resend(process.env.RESEND_API_KEY);
    logger.info("🔑 Resend initialized successfully with API key");
  } else {
    logger.warn("⚠️ RESEND_API_KEY not configured - email sending will be simulated");
  }
} catch (error) {
  logger.error("❌ Failed to initialize Resend:", error);
}

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static readonly DEFAULT_FROM = "DadCircles <noreply@dadcircles.com>";

  /**
   * Send an email using Resend
   */
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    logger.info("📧 EmailService.sendEmail called", {
      to: template.to,
      subject: template.subject,
      from: template.from || this.DEFAULT_FROM,
      hasResend: !!resend,
      apiKeyConfigured: !!process.env.RESEND_API_KEY
    });

    try {
      // If Resend is not configured, simulate email sending for development
      if (!resend) {
        logger.warn("⚠️ SIMULATED EMAIL (Resend not configured)", {
          to: template.to,
          subject: template.subject,
          from: template.from || this.DEFAULT_FROM,
        });
        return true; // Return success for development
      }

      logger.info("🚀 Sending email via Resend API", {
        to: template.to,
        from: template.from || this.DEFAULT_FROM,
        subject: template.subject
      });

      const result = await resend.emails.send({
        from: template.from || this.DEFAULT_FROM,
        to: template.to,
        subject: template.subject,
        html: template.html,
      });

      logger.info("📬 Resend API response received", {
        hasError: !!result.error,
        hasData: !!result.data,
        emailId: result.data?.id
      });

      if (result.error) {
        logger.error("❌ Resend API error:", result.error);
        return false;
      }

      logger.info("✅ Email sent successfully", {
        emailId: result.data?.id,
        to: template.to,
        subject: template.subject,
      });

      return true;
    } catch (error) {
      logger.error("Email service error:", error);
      return false;
    }
  }

  /**
   * Generate welcome email template
   */
  static generateWelcomeEmail(email: string, postcode: string): EmailTemplate {
    return {
      to: email,
      subject: "Welcome to DadCircles! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to DadCircles</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .logo { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .content h2 { color: #1a1a1a; margin-bottom: 20px; }
            .content p { color: #4a5568; line-height: 1.6; margin-bottom: 20px; }
            .highlight { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">DC</div>
              <h1>Welcome to DadCircles!</h1>
            </div>
            
            <div class="content">
              <h2>Thanks for joining our waitlist! 🎉</h2>
              
              <p>Hey there!</p>
              
              <p>We're excited to have you join the DadCircles community. You've just taken the first step toward connecting with other dads in your area who share your interests and experiences.</p>
              
              <div class="highlight">
                <strong>What happens next?</strong><br>
                We're building something special for dads in <strong>${postcode}</strong>. We'll be in touch soon with updates about local dad groups and activities in your area.
              </div>
              
              <p>In the meantime, we're working hard to:</p>
              <ul>
                <li>Find other dads near you</li>
                <li>Match you with people who share your interests</li>
                <li>Set up local meetups and activities</li>
                <li>Build a supportive community for modern fathers</li>
              </ul>
              
              <p>Keep an eye on your inbox - we'll have more exciting updates coming your way soon!</p>
              
              <p>Thanks for being part of the journey.</p>
              
              <p><strong>The DadCircles Team</strong></p>
            </div>
            
            <div class="footer">
              <p>DadCircles is in early alpha - we're building something amazing for dads everywhere.</p>
              <p>Questions? Just reply to this email - we'd love to hear from you!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  /**
   * Generate follow-up email template
   */
  static generateFollowUpEmail(email: string, postcode: string): EmailTemplate {
    return {
      to: email,
      subject: "Building your local dad network in " + postcode,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your DadCircles Update</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .logo { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .content h2 { color: #1a1a1a; margin-bottom: 20px; }
            .content p { color: #4a5568; line-height: 1.6; margin-bottom: 20px; }
            .highlight { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">DC</div>
              <h1>Building Your Network</h1>
            </div>
            
            <div class="content">
              <h2>Progress update from ${postcode} 📍</h2>
              
              <p>Hi again!</p>
              
              <p>We wanted to give you a quick update on what we're building for dads in your area.</p>
              
              <div class="highlight">
                <strong>What we're working on:</strong><br>
                We're actively connecting dads in <strong>${postcode}</strong> and surrounding areas. Our goal is to create meaningful connections between fathers who share similar experiences and interests.
              </div>
              
              <p>Here's what's happening behind the scenes:</p>
              <ul>
                <li><strong>Community Building:</strong> We're identifying other dads in your area</li>
                <li><strong>Interest Matching:</strong> Finding people with shared hobbies and parenting styles</li>
                <li><strong>Local Events:</strong> Planning meetups, playdates, and dad-friendly activities</li>
                <li><strong>Support Network:</strong> Creating spaces for advice, tips, and friendship</li>
              </ul>
              
              <p>We're getting closer to launching the first local groups. When we're ready, you'll be among the first to know about opportunities to connect with other dads near you.</p>
              
              <p>Thanks for your patience as we build something truly valuable for the dad community.</p>
              
              <p><strong>The DadCircles Team</strong></p>
            </div>
            
            <div class="footer">
              <p>Still in early development - but we're making great progress!</p>
              <p>Have ideas or feedback? Reply to this email - we read every message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
}
