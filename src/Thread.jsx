// src/Thread.jsx
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Thread() {
  const { id } = useParams() // post.id
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sender, setSender] = useState('riya') // allow friend by default
  const scrollRef = useRef(null)

  const fetchThread = async () => {
    // fetch post
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()
    setPost(postData || null)

    // fetch messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    // scroll to bottom
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => {
    fetchThread()

    // realtime subscription for messages in this thread
    const channel = supabase
      .channel(`messages:post_id=${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `post_id=eq.${id}` },
        (payload) => {
          // refresh messages on any change
          fetchThread()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const sendReply = async () => {
    if (!replyText.trim()) return

    const { error } = await supabase.from('messages').insert([
      {
        post_id: id,
        sender,
        message_text: replyText
      }
    ])

    if (error) {
      console.error('Failed to send reply', error)
      return
    }

    // if sender is shanay, optionally set posts.replied flag (helpful)
    if (sender === 'shanay') {
      await supabase.from('posts').update({ replied: true }).eq('id', id)
    }

    setReplyText('')
    fetchThread()
  }

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

      <div className="thread-header">
        <h2>Thread</h2>
        {post && (
          <div className="thread-header-meta">
            <span className={`mood-tag mood-${post.mood}`}>{post.mood}</span>
            <span className="cat">{post.category}</span>
          </div>
        )}
      </div>

      <div className="chat-window">
        {messages.map((m) => {
          const cls = m.sender === 'shanay' ? 'shanay' : m.sender === 'user' ? 'user' : 'riya'
          return (
            <div key={m.id} className={`bubble ${cls}`}>
              <div className="sender-name">
                {m.sender === 'shanay' ? 'Shanay' : m.sender === 'user' ? 'User' : 'Riya'}
              </div>
              <div className="msg-text">{m.message_text}</div>
              <div className="msg-time">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          )
        })}
        <div ref={scrollRef} />
      </div>

      <div className="reply-area">
        <label>Reply as:</label>
        <select value={sender} onChange={(e) => setSender(e.target.value)}>
          <option value="riya">Riya</option>
          <option value="user">User</option>
          <option value="shanay">Shanay</option>
        </select>

        <textarea
          rows="2"
          placeholder="Type your reply..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={sendReply}>Send</button>
          <button className="btn ghost" onClick={() => { setReplyText('') }}>Clear</button>
        </div>
      </div>
    </div>
  )
}
