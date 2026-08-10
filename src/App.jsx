import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './App.css'

const APP_ID = '2755559531509591';
const pageColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
const numberFormatter = new Intl.NumberFormat('en-US');
const ageGroups = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

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
  const [lastUpdated, setLastUpdated] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'rawDate', direction: 'desc' })

  const [selectedPageIds, setSelectedPageIds] = useState([])

  const [since, setSince] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 28)
    return d.toISOString().split('T')[0]
  })
  const [until, setUntil] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    document.title = user ? `Dashboard - Social Analytics` : 'Social Analytics';
  }, [user]);

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
      js.async = true;
      js.defer = true;
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
          setSelectedPageIds([response.data[0].id])
        }
      }
    })
  }

  const fetchPageInsights = async () => {
    if (selectedPageIds.length === 0) return
    setLoading(true)
    setLastUpdated(null)

    let aggregatedInsights = {}
    let aggregatedDailyDataMap = {}
    let aggregatedPosts = []
    let aggregatedReactionDataMap = {}
    let aggregatedAgeGenderDataMap = {}
    let aggregatedCountryDataMap = {}

    try {
      for (const pageId of selectedPageIds) {
        const selectedPage = pages.find(p => p.id === pageId)
        const pageAccessToken = selectedPage?.access_token
        const pageName = selectedPage?.name || pageId

        if (!pageAccessToken) continue;

        const metrics = [
          'page_post_engagements',
          'page_impressions',
          'page_actions_post_reactions_total'
        ].join(',')

        const url = `/${pageId}/insights?metric=${metrics}&since=${since}&until=${until}&period=total_over_range&access_token=${pageAccessToken}`
        const dailyUrl = `/${pageId}/insights?metric=${metrics}&since=${since}&until=${until}&period=day&access_token=${pageAccessToken}`
        const postsUrl = `/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions_unique,post_engaged_users)&since=${since}&until=${until}&access_token=${pageAccessToken}`
        const demoUrl = `/${pageId}/insights?metric=page_fans_gender_age,page_fans_country&access_token=${pageAccessToken}`
        const fansUrl = `/${pageId}?fields=fan_count&access_token=${pageAccessToken}`

        const [insightsRes, fansRes, dailyRes, postsRes, demoRes] = await Promise.all([
          new Promise(resolve => window.FB.api(url, resolve)),
          new Promise(resolve => window.FB.api(fansUrl, resolve)),
          new Promise(resolve => window.FB.api(dailyUrl, resolve)),
          new Promise(resolve => window.FB.api(postsUrl, resolve)),
          new Promise(resolve => window.FB.api(demoUrl, resolve))
        ]);

        if (!aggregatedInsights['page_fans']) aggregatedInsights['page_fans'] = [];
        aggregatedInsights['page_fans'].push({ name: pageName, value: fansRes.fan_count || 0 });

        if (insightsRes?.data) {
          insightsRes.data.forEach(item => {
            if (!aggregatedInsights[item.name]) aggregatedInsights[item.name] = [];
            
            if (item.name === 'page_actions_post_reactions_total') {
              const reactions = item.values[0]?.value || {}
              const totalReactions = typeof reactions === 'object'
                ? Object.values(reactions).reduce((a, b) => a + b, 0)
                : reactions
              aggregatedInsights[item.name].push({ name: pageName, value: totalReactions });
              
              if (typeof reactions === 'object') {
                Object.keys(reactions).forEach(key => {
                  const rName = key.charAt(0).toUpperCase() + key.slice(1);
                  if (!aggregatedReactionDataMap[rName]) aggregatedReactionDataMap[rName] = { name: rName };
                  aggregatedReactionDataMap[rName][pageName] = reactions[key];
                });
              }
            } else {
              aggregatedInsights[item.name].push({ name: pageName, value: item.values[0]?.value || 0 });
            }
          })
        }

        if (dailyRes?.data) {
          const engagements = dailyRes.data.find(d => d.name === 'page_post_engagements')?.values || []
          const impressions = dailyRes.data.find(d => d.name === 'page_impressions')?.values || []
          
          engagements.forEach((eng, index) => {
            const dateStr = new Date(eng.end_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!aggregatedDailyDataMap[dateStr]) aggregatedDailyDataMap[dateStr] = { date: dateStr };
            aggregatedDailyDataMap[dateStr][`engagements_${pageName}`] = eng.value || 0;
            aggregatedDailyDataMap[dateStr][`impressions_${pageName}`] = impressions[index]?.value || 0;
          });
        }

        if (postsRes?.data) {
          const pagePosts = postsRes.data.map(post => {
            const insightsArr = post.insights?.data || [];
            const reach = insightsArr.find(i => i.name === 'post_impressions_unique')?.values[0]?.value || 0;
            const engagement = insightsArr.find(i => i.name === 'post_engaged_users')?.values[0]?.value || 0;
            return {
              id: post.id,
              pageName: pageName,
              message: post.message || '',
              date: new Date(post.created_time).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
              rawDate: new Date(post.created_time).getTime(),
              image: post.full_picture || null,
              url: post.permalink_url,
              likes: post.likes?.summary?.total_count || 0,
              comments: post.comments?.summary?.total_count || 0,
              shares: post.shares?.count || 0,
              reach,
              engagement
            }
          });
          aggregatedPosts.push(...pagePosts);
        }

        if (demoRes?.data) {
          const genderAgeRaw = demoRes.data.find(d => d.name === 'page_fans_gender_age')?.values[0]?.value || {};
          const countryRaw = demoRes.data.find(d => d.name === 'page_fans_country')?.values[0]?.value || {};

          ageGroups.forEach(age => {
            if (!aggregatedAgeGenderDataMap[age]) aggregatedAgeGenderDataMap[age] = { age };
            aggregatedAgeGenderDataMap[age][`female_${pageName}`] = genderAgeRaw[`F.${age}`] || 0;
            aggregatedAgeGenderDataMap[age][`male_${pageName}`] = genderAgeRaw[`M.${age}`] || 0;
          });

          Object.keys(countryRaw).forEach(key => {
            if (!aggregatedCountryDataMap[key]) aggregatedCountryDataMap[key] = { name: key };
            aggregatedCountryDataMap[key][pageName] = countryRaw[key];
          });
        }
      }

      setInsights(aggregatedInsights);
      setDailyData(Object.values(aggregatedDailyDataMap));
      setReactionData(Object.values(aggregatedReactionDataMap));
      setPostsData(aggregatedPosts);
      
      const ageGenderArr = Object.values(aggregatedAgeGenderDataMap).filter(d => Object.keys(d).some(k => k !== 'age' && d[k] > 0));
      setAgeGenderData(ageGenderArr);
      
      const countryArr = Object.values(aggregatedCountryDataMap).map(c => {
        let total = 0;
        Object.keys(c).forEach(k => { if (k !== 'name') total += c[k]; });
        return { ...c, total };
      });
      countryArr.sort((a, b) => b.total - a.total);
      setCountryData(countryArr.slice(0, 6));

    } catch (e) {
      console.error(e);
      alert('Failed to fetch insights');
    }

    setLoading(false)
    setLastUpdated(new Date().toLocaleTimeString())
  }

  const handleLogout = () => {
    window.FB.logout(() => {
      setUser(null)
      setPages([])
      setInsights(null)
    })
  }

  const sortedPosts = [...postsData].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const exportToCSV = () => {
    if (!postsData || postsData.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ["Page", "Date", "Post Message", "Reach", "Engagements", "Likes", "Comments", "Shares", "Post URL"];
    const csvRows = [headers.join(",")];
    
    postsData.forEach(post => {
      const safeMessage = `"${post.message.replace(/"/g, '""')}"`;
      const row = [
        `"${post.pageName}"`,
        post.date,
        safeMessage,
        post.reach,
        post.engagement,
        post.likes,
        post.comments,
        post.shares,
        post.url
      ];
      csvRows.push(row.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fb_insights_${since}_to_${until}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) {
      alert("Dashboard not found");
      return;
    }
    
    setLoading(true);
    try {
      const actionArea = document.querySelector('.export-actions');
      if (actionArea) actionArea.style.display = 'none';

      const canvas = await html2canvas(dashboard, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a'
      });
      
      if (actionArea) actionArea.style.display = 'flex';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`fb_insights_${since}_to_${until}.pdf`);
    } catch (error) {
      console.error("PDF Export failed", error);
      alert("Failed to export PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="card">
      {!user ? (
        <section className="login-view">
          <header>
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#1877F2">
                <title>Facebook Logo</title>
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
              title="Sign in with your Facebook account"
              disabled={!sdkLoaded}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {sdkLoaded ? 'Sign in with Facebook' : 'Initialising...'}
            </button>
          </div>
        </section>
      ) : (
        <section className="dashboard">
          <header className="dashboard-header">
            <div className="user-info">
              <img src={user.picture} alt={`${user.name}'s avatar`} className="user-avatar" title={`${user.name}'s Profile`} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/50?text=U' }} />
              <div>
                <h2>Hello, {user.name ? user.name.split(' ')[0] : 'Guest'}</h2>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-outline">Sign Out</button>
          </header>

          <section className="controls">
            <div className="control-group">
              <label>Select Pages ({selectedPageIds.length} selected)</label>
              <div className="page-actions" style={{ marginBottom: '8px' }}>
                <button onClick={() => setSelectedPageIds(pages.map(p => p.id))} className="btn-outline" style={{ padding: '2px 8px', fontSize: '0.8rem', marginRight: '8px' }}>Select All</button>
                <button onClick={() => setSelectedPageIds([])} className="btn-outline" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Clear All</button>
              </div>
              <div className="page-selectors" aria-label="Page Selection List" role="group">
                {pages.length === 0 ? (
                  <div className="no-pages-alert" style={{color: "#f8fafc", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.9rem"}}>No Facebook Pages connected to this account.</div>
                ) : (
                  pages.map(page => (
                    <label key={page.id} className="checkbox-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#f8fafc' }}>
                      <input 
                        type="checkbox" 
                        style={{ marginRight: '8px' }}
                        value={page.id}
                        checked={selectedPageIds.includes(page.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPageIds([...selectedPageIds, page.id])
                          } else {
                            setSelectedPageIds(selectedPageIds.filter(id => id !== page.id))
                          }
                        }}
                      />
                      {page.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <fieldset className="date-fieldset"><legend>Date Range</legend>
              <div style={{ marginBottom: '8px' }}>
                <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 7); setSince(d.toISOString().split('T')[0]); setUntil(new Date().toISOString().split('T')[0]); }} className="btn-outline" style={{ padding: '2px 8px', fontSize: '0.8rem', marginRight: '8px' }}>Last 7 Days</button>
                <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 28); setSince(d.toISOString().split('T')[0]); setUntil(new Date().toISOString().split('T')[0]); }} className="btn-outline" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Last 28 Days</button>
                <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 90); setSince(d.toISOString().split('T')[0]); setUntil(new Date().toISOString().split('T')[0]); }} className="btn-outline" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Last 90 Days</button>
                <button onClick={() => { const d = new Date(); setSince(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]); setUntil(new Date().toISOString().split('T')[0]); }} className="btn-outline" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>This Month</button>
              </div>
              <div className="date-controls">
              <div className="control-group">
                <label>Start Date</label>
                <input type="date" value={since} max={until} onChange={(e) => setSince(e.target.value)} />
              </div>
              <div className="control-group">
                <label>End Date</label>
                <input type="date" value={until} min={since} onChange={(e) => setUntil(e.target.value)} />
              </div>
            </div>
            </fieldset>

            <button
              onClick={fetchPageInsights}
              className="btn-primary"
              disabled={loading || selectedPageIds.length === 0}
            >
              {loading ? <><span className="spinner"></span>Fetching Insights...</> : 'Get Insights'}
            </button>
            {lastUpdated && <span style={{ marginLeft: '12px', fontSize: '0.9rem', color: '#94a3b8' }}>Last updated: {lastUpdated}</span>}
          </section>

          {!insights && <div className="empty-state" style={{textAlign: 'center', padding: '4rem', color: '#94a3b8'}}>Select pages and a date range, then click "Get Insights" to see your data.</div>}

          {insights && (
            <>
              <div className="export-actions" aria-label="Export options" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button onClick={exportToCSV} className="btn-outline" disabled={loading || postsData.length === 0} title="Export data to CSV">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle', position: 'relative', top: '-1px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Export CSV
                </button>
                <button onClick={exportToPDF} className="btn-outline" disabled={loading || postsData.length === 0} title="Export dashboard to PDF">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle', position: 'relative', top: '-1px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>
                  Export PDF
                </button>
              </div>

              <div className="insights-grid">
                <div className="insight-card">
                  <span className="label" title="Total number of page followers">Total Followers</span>
                  <div className="multi-values">
                    {insights.page_fans?.map((p, i) => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', color: pageColors[i % pageColors.length] }}>
                        <span>{p.name}:</span> <strong>{numberFormatter.format(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="insight-card">
                  <span className="label" title="Total number of times people engaged with your posts">Total Engagement</span>
                  <div className="multi-values">
                    {insights.page_post_engagements?.map((p, i) => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', color: pageColors[i % pageColors.length] }}>
                        <span>{p.name}:</span> <strong>{numberFormatter.format(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="insight-card">
                  <span className="label" title="Total number of times your page content entered a person's screen">Total Impressions</span>
                  <div className="multi-values">
                    {insights.page_impressions?.map((p, i) => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', color: pageColors[i % pageColors.length] }}>
                        <span>{p.name}:</span> <strong>{numberFormatter.format(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="insight-card">
                  <span className="label" title="Total number of reactions on your posts">Total Reactions</span>
                  <div className="multi-values">
                    {insights.page_actions_post_reactions_total?.map((p, i) => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', color: pageColors[i % pageColors.length] }}>
                        <span>{p.name}:</span> <strong>{numberFormatter.format(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="charts-container">
                <div className="chart-card">
                  <h3>Engagement Trend</h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        {selectedPageIds.map((id, index) => {
                           const pageName = pages.find(p => p.id === id)?.name || id;
                           return <Line key={id} type="monotone" dataKey={`engagements_${pageName}`} stroke={pageColors[index % pageColors.length]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={pageName} />
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <h3>Impressions Trend</h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        {selectedPageIds.map((id, index) => {
                           const pageName = pages.find(p => p.id === id)?.name || id;
                           return <Line key={id} type="monotone" dataKey={`impressions_${pageName}`} stroke={pageColors[index % pageColors.length]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={pageName} />
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {postsData.length > 0 && (
                <div className="posts-section">
                  <h2>Recent Posts Performance</h2>
                  <div className="table-container">
                    <table className="sortable-table">
                      <thead>
                        <tr>
                          <th onClick={() => requestSort('pageName')} className="sortable-header" title="Click to sort">Page{getSortIcon('pageName')}</th>
                          <th onClick={() => requestSort('rawDate')} className="sortable-header" title="Click to sort">Date{getSortIcon('rawDate')}</th>
                          <th>Post</th>
                          <th onClick={() => requestSort('reach')} className="sortable-header" title="Sort by Reach">Reach{getSortIcon('reach')}</th>
                          <th onClick={() => requestSort('engagement')} className="sortable-header" title="Click to sort">Engagements{getSortIcon('engagement')}</th>
                          <th onClick={() => requestSort('likes')} className="sortable-header" title="Click to sort">Likes{getSortIcon('likes')}</th>
                          <th onClick={() => requestSort('comments')} className="sortable-header" title="Click to sort">Comments{getSortIcon('comments')}</th>
                          <th onClick={() => requestSort('shares')} className="sortable-header" title="Click to sort">Shares{getSortIcon('shares')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPosts.map((post) => (
                          <tr key={post.id}>
                            <td className="date-cell" style={{ color: '#fff', fontWeight: 600 }}>{post.pageName}</td>
                            <td className="date-cell">{post.date}</td>
                            <td className="post-cell">
                              {post.image && <img src={post.image} alt="Post thumbnail" className="post-thumbnail" />}
                              <div className="post-message">
                                <p>{post.message.length > 80 ? post.message.substring(0, 80) + '...' : post.message}</p>
                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-link">View Post <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'4px'}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
                              </div>
                            </td>
                            <td className="metric-cell">{numberFormatter.format(post.reach)}</td>
                            <td className="metric-cell">{numberFormatter.format(post.engagement)}</td>
                            <td className="metric-cell">{numberFormatter.format(post.likes)}</td>
                            <td className="metric-cell">{numberFormatter.format(post.comments)}</td>
                            <td className="metric-cell">{numberFormatter.format(post.shares)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(ageGenderData.length > 0 || countryData.length > 0) && (
                <div className="demographics-section">
                  <h2>Audience Demographics</h2>
                  <div className="charts-container">
                    <div className="chart-card">
                      <h3>Reactions Breakdown</h3>
                      <div className="chart-wrapper">
                        {reactionData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reactionData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                              {selectedPageIds.map((id, index) => {
                                 const pageName = pages.find(p => p.id === id)?.name || id;
                                 return <Bar key={id} dataKey={pageName} name={pageName} fill={pageColors[index % pageColors.length]} radius={[4, 4, 0, 0]} />
                              })}
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">No reaction data available.</div>
                        )}
                      </div>
                    </div>

                    <div className="chart-card">
                      <h3>Top Countries</h3>
                      <div className="chart-wrapper">
                        {countryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={countryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                              {selectedPageIds.map((id, index) => {
                                 const pageName = pages.find(p => p.id === id)?.name || id;
                                 return <Bar key={id} dataKey={pageName} name={pageName} fill={pageColors[index % pageColors.length]} radius={[4, 4, 0, 0]} />
                              })}
                            </BarChart>
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
        </section>
      )}
      <footer className="app-footer">Powered by <a href="https://react.dev" target="_blank" rel="noreferrer" style={{color: '#94a3b8'}}>React</a> & <a href="https://recharts.org" target="_blank" rel="noreferrer" style={{color: '#94a3b8'}}>Recharts</a></footer>
    </main>
  )
}

export default App
