import { useState, useEffect } from 'react'
import { LineChart, Line, PieChart, Pie, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Cell, Legend } from 'recharts'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [pages, setPages] = useState([])
  const [insights, setInsights] = useState(null)
  const [dailyData, setDailyData] = useState([])
  const [reactionData, setReactionData] = useState([])
  const [postsData, setPostsData] = useState([])
  const [ageGenderData, setAgeGenderData] = useState([])
  const [countryData, setCountryData] = useState([])
  const [loading, setLoading] = useState(false)

  const [since, setSince] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 28)
    return d.toISOString().split('T')[0]
  })
  const [until, setUntil] = useState(() => new Date().toISOString().split('T')[0])

  const APP_ID = '2755559531509591'

  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      setSdkLoaded(true)
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, [])

  const handleLogin = () => {
    if (!sdkLoaded) return;

    window.FB.login((response) => {
      if (response.authResponse) {
        fetchUserProfile()
        fetchUserPages()
      }
    }, { scope: 'public_profile,email,pages_show_list,pages_read_engagement,read_insights' })
  }

  const fetchUserProfile = () => {
    window.FB.api('/me', { fields: 'name,email,picture.type(large)' }, (profile) => {
      setUser({
        name: profile.name,
        email: profile.email,
        picture: profile.picture?.data?.url
      })
    })
  }

  const fetchUserPages = () => {
    window.FB.api('/me/accounts', (response) => {
      if (response && response.data) {
        setPages(response.data)
        if (response.data.length > 0) {
          setSelectedPageId(response.data[0].id)
        }
      }
    })
  }

  const fetchPageInsights = () => {
    if (!selectedPageId) return
    setLoading(true)

    const selectedPage = pages.find(p => p.id === selectedPageId)
    const pageAccessToken = selectedPage?.access_token

    if (!pageAccessToken) {
      alert("Could not find page access token.")
      setLoading(false)
      return
    }

    // Phase 3 Metrics: Total Followers, Engagement, Impressions, Reactions
    // Note: page_fans (Total Followers) is a lifetime metric. 
    // The others support period=total_over_range for specified date filtering.
    const metrics = [
      'page_post_engagements',
      'page_impressions',
      'page_actions_post_reactions_total'
    ].join(',')

    const url = `/${selectedPageId}/insights?metric=${metrics}&since=${since}&until=${until}&period=total_over_range&access_token=${pageAccessToken}`
    const dailyUrl = `/${selectedPageId}/insights?metric=${metrics}&since=${since}&until=${until}&period=day&access_token=${pageAccessToken}`
    const postsUrl = `/${selectedPageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions_unique,post_engaged_users)&since=${since}&until=${until}&access_token=${pageAccessToken}`
    const demoUrl = `/${selectedPageId}/insights?metric=page_fans_gender_age,page_fans_country&access_token=${pageAccessToken}`

    // Fetch Lifetime Fans (Followers) separately as it doesn't support total_over_range
    const fansUrl = `/${selectedPageId}?fields=fan_count&access_token=${pageAccessToken}`

    Promise.all([
      new Promise(resolve => window.FB.api(url, resolve)),
      new Promise(resolve => window.FB.api(fansUrl, resolve)),
      new Promise(resolve => window.FB.api(dailyUrl, resolve)),
      new Promise(resolve => window.FB.api(postsUrl, resolve)),
      new Promise(resolve => window.FB.api(demoUrl, resolve))
    ]).then(([insightsResponse, fansResponse, dailyResponse, postsResponse, demoResponse]) => {
      setLoading(false)

      if (insightsResponse && insightsResponse.data) {
        const result = {
          page_fans: fansResponse.fan_count || 0
        }
        let reactions = {}
        insightsResponse.data.forEach(item => {
          if (item.name === 'page_actions_post_reactions_total') {
            reactions = item.values[0]?.value || {}
            const totalReactions = typeof reactions === 'object'
              ? Object.values(reactions).reduce((a, b) => a + b, 0)
              : reactions
            result[item.name] = totalReactions
          } else {
            result[item.name] = item.values[0]?.value || 0
          }
        })
        setInsights(result)

        // Process reaction data for pie chart
        if (typeof reactions === 'object') {
          const rData = Object.keys(reactions).map(key => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: reactions[key]
          })).filter(r => r.value > 0)
          setReactionData(rData)
        }
      } else {
        console.error('Insights Error:', insightsResponse)
        alert('Failed to fetch insights. Check console for details.')
      }

      // Process daily data for line chart
      if (dailyResponse && dailyResponse.data) {
        const engagements = dailyResponse.data.find(d => d.name === 'page_post_engagements')?.values || []
        const impressions = dailyResponse.data.find(d => d.name === 'page_impressions')?.values || []

        const chartData = engagements.map((eng, index) => {
          return {
            date: new Date(eng.end_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            engagements: eng.value || 0,
            impressions: impressions[index]?.value || 0
          }
        })
        setDailyData(chartData)
      }

      // Process post-level data
      if (postsResponse && postsResponse.data) {
        let posts = postsResponse.data.map(post => {
          const insightsArr = post.insights?.data || [];
          const reach = insightsArr.find(i => i.name === 'post_impressions_unique')?.values[0]?.value || 0;
          const engagement = insightsArr.find(i => i.name === 'post_engaged_users')?.values[0]?.value || 0;
          return {
            id: post.id,
            message: post.message || '',
            date: new Date(post.created_time).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
            image: post.full_picture || null,
            url: post.permalink_url,
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0,
            reach,
            engagement
          }
        });

        // Sort by engagement descending
        posts.sort((a, b) => b.engagement - a.engagement);
        setPostsData(posts);
      } else {
        setPostsData([]);
      }

      // Process demographic data
      if (demoResponse && demoResponse.data) {
        const genderAgeRaw = demoResponse.data.find(d => d.name === 'page_fans_gender_age')?.values[0]?.value || {};
        const countryRaw = demoResponse.data.find(d => d.name === 'page_fans_country')?.values[0]?.value || {};

        const ageGroups = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
        const formattedAgeData = ageGroups.map(age => ({
          age,
          female: genderAgeRaw[`F.${age}`] || 0,
          male: genderAgeRaw[`M.${age}`] || 0
        })).filter(d => d.female > 0 || d.male > 0);

        setAgeGenderData(formattedAgeData);

        const countryArr = Object.keys(countryRaw).map(key => ({
          name: key,
          value: countryRaw[key]
        }));
        countryArr.sort((a, b) => b.value - a.value);
        setCountryData(countryArr.slice(0, 6)); // Top 6 countries
      }
    })
  }

  const handleLogout = () => {
    window.FB.logout(() => {
      setUser(null)
      setPages([])
      setInsights(null)
    })
  }

  return (
    <div className="card">
      {!user ? (
        <div className="login-view">
          <header>
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <h1>Social Analytics</h1>
          </header>

          <p className="subtitle">
            Securely connect your Facebook account to analyze your page performance with real-time insights.
          </p>

          <div className="action-area">
            <button
              onClick={handleLogin}
              className="fb-login-btn"
              disabled={!sdkLoaded}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {sdkLoaded ? 'Sign in with Facebook' : 'Initialising...'}
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <header className="dashboard-header">
            <div className="user-info">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <div>
                <h2>Hello, {user.name.split(' ')[0]}</h2>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-outline">Sign Out</button>
          </header>

          <section className="controls">
            <div className="control-group">
              <label>Select Page</label>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
              >
                {pages.length === 0 ? (
                  <option value="">No pages found</option>
                ) : (
                  pages.map(page => (
                    <option key={page.id} value={page.id}>{page.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="date-controls">
              <div className="control-group">
                <label>Since</label>
                <input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
              </div>
              <div className="control-group">
                <label>Until</label>
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
              </div>
            </div>

            <button
              onClick={fetchPageInsights}
              className="btn-primary"
              disabled={loading || !selectedPageId}
            >
              {loading ? 'Fetching...' : 'Get Insights'}
            </button>
          </section>

          {insights && (
            <>
              <div className="insights-grid">
                <div className="insight-card">
                  <span className="label">Total Followers</span>
                  <span className="value">{insights.page_fans?.toLocaleString() || 0}</span>
                </div>
                <div className="insight-card">
                  <span className="label">Total Engagement</span>
                  <span className="value">{insights.page_post_engagements?.toLocaleString() || 0}</span>
                </div>
                <div className="insight-card">
                  <span className="label">Total Impressions</span>
                  <span className="value">{insights.page_impressions?.toLocaleString() || 0}</span>
                </div>
                <div className="insight-card">
                  <span className="label">Total Reactions</span>
                  <span className="value">{insights.page_actions_post_reactions_total?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="charts-container">
                <div className="chart-card">
                  <h3>Engagement & Impressions Trend</h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Impressions" />
                        <Line type="monotone" dataKey="engagements" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Engagements" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <h3>Reactions Breakdown</h3>
                  <div className="chart-wrapper">
                    {reactionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reactionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {reactionData.map((entry, index) => {
                              const colors = ['#3b82f6', '#f43f5e', '#eab308', '#10b981', '#8b5cf6', '#f97316'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">No reaction data available for this period.</div>
                    )}
                  </div>
                </div>
              </div>

              {postsData.length > 0 && (
                <div className="posts-section">
                  <h2>Recent Posts Performance</h2>
                  <div className="posts-grid">
                    {postsData.map((post, index) => (
                      <div key={post.id} className={`post-card ${index === 0 ? 'top-post' : ''}`}>
                        {index === 0 && <div className="top-badge">🌟 Top Performer</div>}
                        {post.image && (
                          <div className="post-image">
                            <img src={post.image} alt="Post" />
                          </div>
                        )}
                        <div className="post-content">
                          <span className="post-date">{post.date}</span>
                          <p>{post.message.length > 100 ? post.message.substring(0, 100) + '...' : post.message}</p>
                          <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-link">View on Facebook</a>
                        </div>
                        <div className="post-metrics">
                          <div className="metric">
                            <span className="metric-label">Reach</span>
                            <span className="metric-value">{post.reach.toLocaleString()}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Engagements</span>
                            <span className="metric-value">{post.engagement.toLocaleString()}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Likes</span>
                            <span className="metric-value">{post.likes.toLocaleString()}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Comments</span>
                            <span className="metric-value">{post.comments.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(ageGenderData.length > 0 || countryData.length > 0) && (
                <div className="demographics-section">
                  <h2>Audience Demographics</h2>
                  <div className="charts-container">
                    <div className="chart-card">
                      <h3>Age & Gender Distribution</h3>
                      <div className="chart-wrapper">
                        {ageGenderData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageGenderData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="age" stroke="#94a3b8" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                              <Bar dataKey="female" name="Female" fill="#ec4899" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="male" name="Male" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">Not enough age/gender data available.</div>
                        )}
                      </div>
                    </div>

                    <div className="chart-card">
                      <h3>Top Countries</h3>
                      <div className="chart-wrapper">
                        {countryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={countryData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                {countryData.map((entry, index) => {
                                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">Not enough country data available.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
