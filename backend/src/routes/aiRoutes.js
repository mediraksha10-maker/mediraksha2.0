import router from 'express';

const aiRoutes = router.Router();

// Example AI chat route
aiRoutes.post('/', async (req, res) => {
  const { message } = req.body;

  // Here you would integrate with your AI model to get a response
  // For demonstration, we'll just echo the message back
  const aiResponse = "hello you are criticaly ill and you need to go to hospital immediately";

  res.json({ response: aiResponse });
});

export default aiRoutes;