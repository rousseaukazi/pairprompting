import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type NotificationEmailData = {
  to: string
  recipientName: string
  senderName: string
  senderEmoji: string
  explorationTitle: string
  explorationId: string
  type: 'new_block' | 'new_comment'
  content: string
  blockId?: string
}

const getEmailTemplate = (data: NotificationEmailData) => {
  const { type, senderName, senderEmoji, explorationTitle, content, recipientName } = data
  
  const actionText = type === 'new_block' ? 'added a new insight' : 'left a comment'
  const emoji = type === 'new_block' ? '💡' : '💬'
  
  return {
    subject: `${emoji} ${senderName} ${actionText} in "${explorationTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Activity in ${explorationTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
              overflow: hidden;
              margin-top: 20px;
              margin-bottom: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 32px 24px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 32px 24px;
            }
            .notification-card {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .sender-info {
              display: flex;
              align-items: center;
              margin-bottom: 16px;
            }
            .sender-avatar {
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              margin-right: 12px;
            }
            .sender-name {
              font-weight: 600;
              color: #1a202c;
            }
            .action-text {
              color: #4a5568;
              font-size: 14px;
            }
            .content-preview {
              background: white;
              border-radius: 6px;
              padding: 16px;
              margin-top: 12px;
              border: 1px solid #e2e8f0;
              font-style: italic;
              color: #2d3748;
            }
            .cta {
              text-align: center;
              margin: 32px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 12px 32px;
              border-radius: 6px;
              font-weight: 600;
              transition: transform 0.2s;
            }
            .cta-button:hover {
              transform: translateY(-1px);
            }
            .footer {
              background: #f7fafc;
              padding: 24px;
              text-align: center;
              color: #718096;
              font-size: 14px;
              border-top: 1px solid #e2e8f0;
            }
            .exploration-title {
              font-weight: 600;
              color: #4c51bf;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 PairPrompting</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">New activity in your exploration</p>
            </div>
            
            <div class="content">
              <p>Hi <strong>${recipientName}</strong>,</p>
              
              <div class="notification-card">
                <div class="sender-info">
                  <div class="sender-avatar">${senderEmoji}</div>
                  <div>
                    <div class="sender-name">${senderName}</div>
                    <div class="action-text">${actionText} in <span class="exploration-title">${explorationTitle}</span></div>
                  </div>
                </div>
                
                <div class="content-preview">
                  "${content.length > 150 ? content.substring(0, 150) + '...' : content}"
                </div>
              </div>
              
              <div class="cta">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/e/${data.explorationId}" class="cta-button">
                  View in Exploration →
                </a>
              </div>
              
              <p style="color: #718096; font-size: 14px;">
                💡 <strong>Tip:</strong> Reply with your own insights and keep the conversation going!
              </p>
            </div>
            
            <div class="footer">
              <p>
                You're receiving this because you're a member of the <strong>${explorationTitle}</strong> exploration.
              </p>
              <p style="margin-top: 12px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="color: #4c51bf;">View all your explorations</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${recipientName},

${senderName} ${actionText} in "${explorationTitle}":

"${content}"

View the full exploration: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/e/${data.explorationId}

---
PairPrompting - Explore topics together with AI
    `.trim()
  }
}

export async function sendNotificationEmail(data: NotificationEmailData) {
  try {
    const template = getEmailTemplate(data)
    
    const result = await resend.emails.send({
      from: 'PairPrompting <notifications@resend.dev>', // Using Resend's sandbox domain
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    console.log('Email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendBulkNotificationEmails(notifications: NotificationEmailData[]) {
  const results = await Promise.allSettled(
    notifications.map(notification => sendNotificationEmail(notification))
  )
  
  const successful = results.filter(result => result.status === 'fulfilled').length
  const failed = results.filter(result => result.status === 'rejected').length
  
  console.log(`Email notifications sent: ${successful} successful, ${failed} failed`)
  
  return { successful, failed, results }
} 