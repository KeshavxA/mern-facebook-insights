# Facebook Page Insights Dashboard

A professional MERN-stack application that integrates with the Facebook Graph API to provide real-time analytics for managed Facebook Pages. This project was built as part of a Full Stack Developer assessment.

![Dashboard Preview](https://raw.githubusercontent.com/meta-api-expert/mern-test/main/preview.png)

## 🚀 Features

- **Facebook OAuth 2.0 Integration**: Secure login using the official Facebook JavaScript SDK.
- **Managed Pages Retrieval**: Automatically fetches all Facebook Pages managed by the authenticated user.
- **Real-Time Analytics**: Insights fetched directly from the Graph API using `total_over_range`.
- **Key Metrics Dashboard**:
  - Total Followers/Fans
  - Total Engagement
  - Total Impressions
  - Total Reactions
- **Advanced Filtering**: Custom date range selection (`since` & `until`) for focused data analysis.
- **Premium UI/UX**: Built with React and Vanilla CSS, featuring glassmorphism, smooth animations, and a responsive dark-mode theme.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite
- **Styling**: Vanilla CSS (Custom tokens & Glassmorphism)
- **API**: Facebook Graph API (v18.0+)
- **Security**: HTTPS-enforced development environment

## 📋 Prerequisites

Before running the project, ensure you have:
- Node.js (v16+)
- A Facebook Developer Account
- A Facebook App configured with:
  - `pages_show_list`
  - `pages_read_engagement`
  - `read_insights`

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/mern-facebook-insights.git
   cd mern-facebook-insights
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the App ID**:
   Update the `APP_ID` constant in `src/App.jsx` with your Facebook App ID.

4. **Run in Development**:
   ```bash
   npm run dev
   ```
   *Note: Access the app via `https://localhost:3000` to ensure Facebook SDK compatibility.*

## 🔒 Security Note

This app requires an HTTPS environment even in development for Facebook Login to function. The project is pre-configured with `@vitejs/plugin-basic-ssl`.

## 📜 License

This project is licensed under the MIT License.
