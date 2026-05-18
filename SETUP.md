# Portfolio CMS — Setup Guide

## Step 1: Install Node.js
Download and install from: https://nodejs.org (choose "LTS" version)

After installing, open a new terminal/PowerShell and verify:
```
node --version
npm --version
```

## Step 2: Install dependencies
Open PowerShell or Terminal, navigate to this folder, and run:
```
cd "F:\claudecode\Portfolio Site"
npm install
```

## Step 3: Change the admin password (recommended)
Open the `.env` file and change `ADMIN_PASSWORD=admin123` to your own password.

## Step 4: Start the server
```
node server.js
```

You'll see:
```
🚀 Portfolio CMS running!
   Portfolio : http://localhost:3000
   Admin     : http://localhost:3000/admin
   Password  : your-password
```

## Step 5: Open the admin dashboard
Go to: http://localhost:3000/admin
Enter your password from the `.env` file.

---

## Admin Dashboard Sections

| Section | What You Can Edit |
|---|---|
| **Site Settings** | Name, logo, colors, social links, availability status, contact info |
| **Images** | Upload logo, profile photo, portfolio thumbnails |
| **Hero Section** | Headlines, description, CTA buttons, stats, dashboard card |
| **Services** | Add/edit/delete service cards + tags |
| **Portfolio** | Add/edit/delete portfolio items + metrics |
| **Testimonials** | Add/edit/delete client reviews |
| **Process Steps** | The 4-step process section |
| **Pricing Plans** | 3 plans with features, pricing, featured toggle |
| **About Page** | Bio, skills, timeline, values, tools, certifications |
| **Contact Info** | Email, phone, location, page text |
| **Case Study** | All case study metrics and content |
| **Images** | Central image library — upload and copy URLs |

## Saving Changes
- **Save Section** button: saves just the current section
- **Save All** button (top right): saves all pending changes at once
- Orange dot indicator: shows you have unsaved changes

## Image Uploads
- Supported: JPEG, PNG, GIF, WebP, SVG
- Max size: 10MB per file
- Images stored in `data/uploads/`
- After upload, URL is auto-copied to clipboard

## To stop the server
Press `Ctrl+C` in the terminal window.

## To run on startup (optional)
Install pm2: `npm install -g pm2`
Then: `pm2 start server.js --name portfolio`
