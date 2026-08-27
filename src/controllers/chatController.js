const { generateAIResponse } = require('../services/aiService');
const supabase = require('../services/supabaseClient');

async function handleIncomingMessage(req, res) {
  console.log("Received request:", req.body);
  try {
    const { userId, message, imageBase64, mimeType, steps, distance } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 1. Fetch chat history from Supabase
    const { data: historyData, error: fetchError } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20); // Keep context window manageable

    if (fetchError && fetchError.code !== '42P01') {
      console.error("Supabase Fetch Error:", fetchError);
    }
    
    const history = historyData || [];

    // 2. Process message via AI Service
    const aiReply = await generateAIResponse(history, message, imageBase64, mimeType, steps, distance);

    // 3. Save User message & AI reply to DB with explicit timestamps 1 millisecond apart
    const now = new Date();
    const userTime = new Date(now.getTime());
    const modelTime = new Date(now.getTime() + 10); // 10ms later

    const { data: insertedData, error: insertError } = await supabase.from('messages').insert([
      { user_id: userId, role: 'user', content: message || "[Mengirim Gambar]", created_at: userTime.toISOString() },
      { user_id: userId, role: 'model', content: aiReply, created_at: modelTime.toISOString() }
    ]).select('id, role');

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
    }

    // Get the IDs if inserted successfully
    const userMessageId = insertedData && insertedData[0] ? insertedData[0].id : null;
    const aiMessageId = insertedData && insertedData[1] ? insertedData[1].id : null;

    // 4. Send response back to frontend
    res.json({ 
      reply: aiReply,
      userMessageId: userMessageId,
      aiMessageId: aiMessageId
    });
  } catch (error) {
    console.error('Error handling chat message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getHistory(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { data: history, error } = await supabase
      .from('messages')
      .select('id, role, content, reaction, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // Get last 50 messages, reversed so the UI can just display them from bottom to top

    if (error) throw error;
    res.json(history || []);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateReaction(req, res) {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    const { data, error } = await supabase
      .from('messages')
      .update({ reaction: reaction })
      .eq('id', messageId)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  handleIncomingMessage,
  getHistory,
  updateReaction
};
