// src/Home.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Home() {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Personal')
  const [mood, setMood] = useState('Neutral')
  const [posts, setPosts] = useState([])
  const [message, setMessage] = useState('')

  // Fetch posts (latest first)
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error.message)
      return
    }
    setPosts(data || [])
  }

  useEffect(() => {
    fetchPosts()

    // realtime subscription for new posts (optional)
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Create post + initial message
  const handleSubmit = async () => {
    if (!content.trim()) {
      setMessage('Please write something before submitting.')
      return
    }

    // 1) Insert into posts and get inserted row
    const { data: postData, error: postErr } = await supabase
      .from('posts')
      .insert([{ content, category, mood }])
      .select()
      .single()

    if (postErr || !postData) {
      console.error('Error creating post:', postErr)
      setMessage('Error creating post: ' + (postErr?.message || 'unknown'))
      return
    }

    // 2) Create first message in messages table
    const { error: msgErr } = await supabase.from('messages').insert([
      {
        post_id: postData.id,
        sender: 'user',
        message_text: content
      }
    ])

    if (msgErr) {
      console.error('Error creating initial message:', msgErr)
      setMessage('Post created but failed to save message.')
    } else {
      setMessage('✨ Whisper released. Shanay will see it soon.')
      setContent('')
      fetchPosts()
    }
  }

  return (
    <div className="container">
      <header className="hero">
        <h1>WhisperSpace 💫</h1>
        <p className="subtitle">
          A cozy corner for your happy, sad, angry or thoughtful whispers. 
        </p>
      </header>

      <section className="card-new-post">
        <h3>Share a Whisper</h3>

        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>Personal</option>
          <option>Stress</option>
          <option>Work</option>
          <option>Ideas</option>
        </select>

        <label>Mood</label>
        <select value={mood} onChange={(e) => setMood(e.target.value)}>
          <option>Happy</option>
          <option>Sad</option>
          <option>Neutral</option>
          <option>Angry</option>
        </select>

        <textarea
          rows="4"
          value={content}
          placeholder="What's on your mind?"
          onChange={(e) => setContent(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={handleSubmit}>Submit</button>
          <button className="btn ghost" onClick={() => { setContent(''); setMessage('') }}>Clear</button>
        </div>

        {message && <p className="success">{message}</p>}
      </section>

      <h2 className="inbox-title">Threads</h2>

      <div className="thread-grid">
        {posts.map((p) => (
          <Link key={p.id} to={`/thread/${p.id}`} className="thread-card">
            <div className="thread-meta">
              <span className={`mood-tag mood-${p.mood}`}>{p.mood}</span>
              <span className="cat">{p.category}</span>
            </div>
            <p className="preview">{(p.content || '').slice(0, 120)}</p>
            <div className="thread-foot">
              <small>{new Date(p.created_at).toLocaleString()}</small>
              <small>{p.replied ? '💬 replied' : '⏳ waiting'}</small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
