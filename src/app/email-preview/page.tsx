'use client';

import { schoolbaseSocialLinks } from "@/lib/social-links";

export default function EmailPreviewPage() {
  const adminName = 'John Doe';
  const schoolName = 'Greenfield Academy';
  const socialFooterLinks = schoolbaseSocialLinks
    .map(({ label, href }) => `<a href="${href.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" style="color: #0A66C2; text-decoration: none;">${label}</a>`)
    .join(' | ');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
    .email-header { background-color: #0A66C2; color: white; padding: 20px; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; background-color: #eef2ff; border-radius: 9999px; width: 80px; height: 80px; margin: 0 auto 10px auto; }
    .email-header img { height: 44px; width: auto; display: block; }
    .email-header h1 { margin: 0; font-size: 24px; }
    .email-hero { background: linear-gradient(135deg, #0A66C2 0%, #1e40af 100%); color: white; padding: 40px 20px; text-align: center; }
    .email-hero h2 { margin: 0 0 10px 0; font-size: 28px; }
    .email-hero p { margin: 0; font-size: 16px; opacity: 0.9; }
    .email-content { padding: 30px 20px; color: #334155; line-height: 1.6; }
    .email-content p { margin: 0 0 16px 0; }
    .email-content strong { color: #0A66C2; }
    .highlight-box { background-color: #f1f5f9; border-left: 4px solid #0A66C2; padding: 16px; margin: 20px 0; font-style: italic; color: #64748b; }
    .success-box { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 24px 0; border-radius: 4px; color: #166534; font-weight: 600; }
    .features-list { margin: 20px 0 20px 20px; color: #334155; }
    .features-list li { margin-bottom: 8px; }
    .cta-button { display: inline-block; background-color: #0A66C2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .email-footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <a href="https://schoolbase.live" target="_blank" rel="noreferrer" class="logo-badge">
        <img src="https://schoolbase.live/logo.png" alt="SchoolBase Logo" />
      </a>
      <h1>SchoolBase</h1>
    </div>

    <div class="email-hero">
      <h2>Welcome to SchoolBase, ${adminName}!</h2>
      <p>Smart behind the scenes. Simple on your screen.</p>
    </div>

    <div class="email-content">
      <p>Hello ${adminName},</p>
      
      <p>My name is <strong>Nwokpor Raymond Ikenna</strong>, Founder and CEO of <strong>ClickBase Technologies Ltd</strong>, and I want to personally welcome you to <strong>SchoolBase</strong>.</p>
      
      <p>Across Africa, school owners, principals, bursars, and teachers work harder than most people will ever see.</p>
      
      <p>Long days. Endless paperwork. Fee records scattered in notebooks. Result periods filled with pressure. Parents waiting for updates that should have arrived hours ago. Staff trying their best with systems that were never truly built for them.</p>
      
      <p><strong>We understood that frustration deeply.</strong></p>
      
      <p>That is why we created <strong>SchoolBase</strong>.</p>
      
      <p>Not just as another school software, but as a calm and modern system designed for African schools first, simple enough for everyday staff, powerful enough for growing schools, and professional enough to make parents trust your institution even more.</p>
      
      <div class="highlight-box">
        We believe schools should spend less time chasing records and more time building futures.
      </div>
      
      <p><strong>With SchoolBase, your school can:</strong></p>
      
      <ul class="features-list">
        <li>Manage fees and receipts professionally</li>
        <li>Publish results with confidence</li>
        <li>Communicate with parents instantly</li>
        <li>Track attendance easily</li>
        <li>Run a modern school website, all in one place</li>
      </ul>
      
      <p><strong>And the best part is this:</strong> you do not need a big IT department to use it.</p>
      
      <p>We designed SchoolBase to feel simple from the very first click.</p>
      
      <div class="success-box">
        Your workspace is now ready, and we are excited to walk this journey with you.
      </div>
      
      <p>Our team is here to support you as you set up your school, staff, students, and daily operations. If you need help at any point, simply reply to this email and we will be there.</p>
      
      <p>Thank you for trusting us.<br/><strong>We are honoured to serve schools building the next generation of Africa.</strong></p>

      <center>
        <a href="https://schoolbase.live/admin" class="cta-button">Go to your workspace</a>
      </center>
    </div>

    <div class="email-footer">
      <p>
        <strong>Warm regards,</strong><br/>
        Nwokpor Raymond Ikenna<br/>
        Chairman - ClickBase Group<br/><br/>
        Follow SchoolBase:<br/>
        ${socialFooterLinks || 'Official social accounts will be added soon.'}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Email Preview</h1>
          <p className="text-gray-600">This is how the welcome email looks to new school admins after signup</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Email Preview */}
          <iframe
            srcDoc={htmlContent}
            className="w-full"
            style={{ minHeight: '1400px', border: 'none' }}
            title="Welcome Email Preview"
          />
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Email Details</h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-gray-700">Subject:</dt>
              <dd className="text-gray-600">Welcome to SchoolBase | Smart behind the scenes. Simple on your screen.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Recipient:</dt>
              <dd className="text-gray-600">{adminName} (${schoolName})</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Sent When:</dt>
              <dd className="text-gray-600">Immediately after school admin verifies OTP signup</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Purpose:</dt>
              <dd className="text-gray-600">Welcome new schools and introduce SchoolBase value proposition</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Template:</dt>
              <dd className="text-gray-600">buildWelcomeEmail() function in /lib/email.ts</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>View this preview:</strong> Visit <code className="bg-gray-200 px-2 py-1 rounded">/email-preview</code> to see this design in action
          </p>
        </div>
      </div>
    </div>
  );
}
