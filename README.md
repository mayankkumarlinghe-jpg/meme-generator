# 🤖 AI Meme Generator Pro

Welcome to the **AI Meme Generator Pro**! This is an interactive web application that allows users to quickly and easily create memes using popular templates or their own images. It features an integrated AI assistant powered by Google Gemini to help generate funny and context-aware meme captions!

## ✨ Features

* **Meme Templates**: Browse and select from popular meme templates via the [Imgflip API](https://imgflip.com/api).
* **Image Upload**: Upload your own custom images (JPG, PNG, GIF) up to 5MB to use as meme backgrounds.
* **Meme Editor**: Customize your meme with top and bottom text, adjustable font size, font family, text color, and stroke settings.
* **AI-Powered Captions**: Leverage Google Gemini AI to automatically generate funny captions, suggest themes, or improve your current text.
* **Export & Share**: Download your generated meme directly to your device or share it.

## 🛠️ Technologies Used

* **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
* **External APIs**:
  * [Imgflip API](https://imgflip.com/api) - To fetch the latest popular meme templates.
  * [Google Gemini AI API](https://ai.google.dev/) - For AI-generated meme captions and contextual theme suggestions.
* **Styling & Assets**:
  * FontAwesome for beautiful, responsive UI icons.

## 🚀 Getting Started

To get a local copy up and running, simply follow these steps.

### Prerequisites

You don't need any complex build tools. Just a modern web browser! For the AI functionalities, you will need to add your own Gemini API key inside the script depending on how the application is configured.

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mayankkumarlinghe-jpg/meme-generator.git
   ```
2. **Navigate into the directory:**
   ```bash
   cd meme-generator
   ```
3. **Open the App:**
   Simply open `index.html` in your favorite web browser (or use an extension like VS Code Live Server).

## 📁 Project Structure

```text
meme-generator/
├── index.html           # Main application layout and structure
├── style.css            # Styles, color modes, and layout formatting
├── app.js               # Application logic, canvas manipulation, API handling
├── recommendations.js   # Script handling contextual AI recommendations and themes
└── README.md            # This file!
```

## 🧠 How the AI Works

The **AI Assistant** takes the pain out of thinking of the perfect joke. By simply selecting an image or a template, the embedded Generative AI returns playfully generated text that fits the meme background perfectly! You can choose to generate complete sentences, get theme ideas, or magically refine your own drafted captions.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check out the issues page or fork the repository to create your own branch!