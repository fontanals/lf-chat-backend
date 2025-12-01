export function accountVerificationEmail(name: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Account Verification</title>
    <style>
      body {
        color: #333;
        background-color: #f4f4f7;
        font-family: Arial, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .header h1 {
        font-size: 24px;
        color: #2d3748;
      }
      .content {
        line-height: 1.6;
        font-size: 16px;
      }
      .btn {
        display: inline-block;
        background-color: #ff982a;
        color: #fff;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        margin: 20px 0;
        font-weight: bold;
      }
      .footer {
        font-size: 12px;
        color: #888;
        text-align: center;
        margin-top: 20px;
      }
      a {
        color: #ff982a;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Verify Your Account</h2>
      </div>
      <div class="content">
        <p>Hi, ${name}</p>
        <p>
          Welcome! Please verify your email address to complete your account
          setup. Click the button below to confirm your account. This link is
          valid for
          <strong>15 minutes</strong>.
        </p>
        <p style="text-align: center">
          <a href="{{VERIFICATION_LINK}}" class="btn">Verify Account</a>
        </p>
        <p>
          If you did not create an account with us, you can safely ignore this
          email.
        </p>
        <p>Thanks,<br />The LF Chat Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 LF Chat. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;
}

export function passwordRecoveryEmail(name: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset</title>
    <style>
      body {
        color: #333;
        background-color: #f4f4f7;
        font-family: Arial, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .header h1 {
        font-size: 24px;
        color: #2d3748;
      }
      .content {
        line-height: 1.6;
        font-size: 16px;
      }
      .btn {
        display: inline-block;
        background-color: #ff982a;
        color: #fff;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        margin: 20px 0;
        font-weight: bold;
      }
      .footer {
        font-size: 12px;
        color: #888;
        text-align: center;
        margin-top: 20px;
      }
      a {
        color: #ff982a;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Password Reset Request</h2>
      </div>
      <div class="content">
        <p>Hi, ${name}</p>
        <p>
          We received a request to reset your password. Click the button below
          to choose a new password. This link is valid for
          <strong>15 minutes</strong>.
        </p>
        <p style="text-align: center">
          <a href="{{RESET_LINK}}" class="btn">Reset Password</a>
        </p>
        <p>
          If you did not request a password reset, you can safely ignore this
          email.
        </p>
        <p>Thanks,<br />The LF Chat Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 LF Chat. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;
}
