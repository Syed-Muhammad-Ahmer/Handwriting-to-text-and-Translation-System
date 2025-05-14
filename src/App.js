import React, { useState, useCallback } from 'react';
import { Box, Container, Typography, Button, CircularProgress, Select, MenuItem, Paper, TextField, FormControl, InputLabel, Tooltip } from '@mui/material';
import { CloudUpload, SwapHoriz, Info, Translate } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [apiProvider, setApiProvider] = useState('libretranslate');
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState({
  libretranslate: true,
  mymemory: true,
  google: true,
  azure: true,       // Add Azure
  deepl: true        // Add DeepL
});

  const languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ar', name: 'Arabic' },
  ];

 const apiProviders = [
  { id: 'libretranslate', name: 'LibreTranslate', free: true },
  { id: 'mymemory', name: 'MyMemory', free: true },
  { id: 'google', name: 'Google Cloud', free: false },
  { id: 'azure', name: 'Microsoft Azure', free: false },    // Add Azure
  { id: 'deepl', name: 'DeepL', free: false }              // Add DeepL
];

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    const file = acceptedFiles[0];
    if (file && file.type.match('image.*')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please upload an image file.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    maxFiles: 1,
  });

  const extractText = async () => {
    if (!image) {
      setError('Please upload an image first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await Tesseract.recognize(
        image,
        'eng+spa+fra+deu+ita+por+rus+chi_sim+jpn+ara',
        { logger: m => console.log(m) }
      );
      setExtractedText(result.data.text);
    } catch (err) {
      setError('Error extracting text. Please try another image.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
const translateWithAzure = async (text, targetLang) => {
  try {
    const response = await axios.post(
      'https://api.cognitive.microsofttranslator.com/translate',
      [{ Text: text }],
      {
        params: {
          'api-version': '3.0',
          to: targetLang,
        },
        headers: {
          'Ocp-Apim-Subscription-Key': 'YOUR_AZURE_KEY',
          'Ocp-Apim-Subscription-Region': 'YOUR_REGION',
        },
      }
    );
    return response.data[0].translations[0].text;
  } catch (err) {
    console.error('Azure error:', err);
    setApiStatus(prev => ({ ...prev, azure: false }));
    throw err;
  }
};

const translateWithDeepL = async (text, targetLang) => {
  try {
    const response = await axios.post(
      'https://api-free.deepl.com/v2/translate',
      new URLSearchParams({
        text: text,
        target_lang: targetLang.toUpperCase(),
      }),
      {
        headers: {
          'Authorization': 'DeepL-Auth-Key YOUR_DEEPL_KEY',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.translations[0].text;
  } catch (err) {
    console.error('DeepL error:', err);
    setApiStatus(prev => ({ ...prev, deepl: false }));
    throw err;
  }
};
  // Translation functions for different APIs
  const translateWithLibreTranslate = async (text, targetLang) => {
    try {
      const response = await axios.post('https://libretranslate.de/translate', {
        q: text,
        source: 'auto',
        target: targetLang,
      });
      return response.data.translatedText;
    } catch (err) {
      console.error('LibreTranslate error:', err);
      setApiStatus(prev => ({ ...prev, libretranslate: false }));
      throw err;
    }
  };

  const translateWithMyMemory = async (text, targetLang) => {
  try {
    // First try to detect the language
    let sourceLang = 'en'; // default to English
    
    // You could use a language detection library here or
    // implement a simple detection mechanism
    // For now, we'll use English as default
    
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: text,
        langpair: `${sourceLang}|${targetLang}`,
      }
    });
    
    if (response.data.responseStatus === 403) {
      throw new Error('Invalid language pair');
    }
    
    return response.data.responseData.translatedText;
  } catch (err) {
    console.error('MyMemory error:', err);
    setApiStatus(prev => ({ ...prev, mymemory: false }));
    throw err;
  }
};

  const translateWithGoogle = async (text, targetLang) => {
    try {
      // This is a mock implementation - you would need to set up Google Cloud Translation
      // and use the proper SDK or API key
      const response = await axios.post('https://translation.googleapis.com/language/translate/v2', {
        q: text,
        target: targetLang,
        key: 'YOUR_GOOGLE_API_KEY', // Replace with actual API key
      });
      return response.data.data.translations[0].translatedText;
    } catch (err) {
      console.error('Google Translate error:', err);
      setApiStatus(prev => ({ ...prev, google: false }));
      throw err;
    }
  };
const translateText = async () => {
  if (!extractedText.trim()) {
    setError('No text to translate. Please extract text first.');
    return;
  }

  setLoading(true);
  setError('');
  setTranslatedText('');

  // Determine which APIs are available
  const availableApis = apiProviders.filter(provider => apiStatus[provider.id]);
  if (availableApis.length === 0) {
    setError('All translation services are currently unavailable. Please try again later.');
    setLoading(false);
    return;
  }

  // Try APIs in order of preference
  let translationAttempts = [];
  
  if (apiStatus.libretranslate) {
    translationAttempts.push(() => translateWithLibreTranslate(extractedText, targetLanguage));
  }
  if (apiStatus.mymemory) {
    translationAttempts.push(() => translateWithMyMemory(extractedText, targetLanguage));
  }
  if (apiStatus.google) {
    translationAttempts.push(() => translateWithGoogle(extractedText, targetLanguage));
  }
  if (apiStatus.azure) {
    translationAttempts.push(() => translateWithAzure(extractedText, targetLanguage));
  }
  if (apiStatus.deepl) {
    translationAttempts.push(() => translateWithDeepL(extractedText, targetLanguage));
  }

  // Try each API until one succeeds
  for (let attempt of translationAttempts) {
    try {
      const result = await attempt();
      setTranslatedText(result);
      setError('');
      break;
    } catch (err) {
      console.error('Translation attempt failed:', err);
      // Continue to next attempt
    }
  }

  if (!translatedText) {
    setError('Translation failed with all available services. Please try again later.');
  }

  setLoading(false);
};
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 4 }}>
        <Translate sx={{ verticalAlign: 'middle', mr: 1 }} />
        Image Text Translator
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <div {...getRootProps()} style={{
          border: '2px dashed #1976d2',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: isDragActive ? '#f0f7ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
        }}>
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
          <Typography variant="h6">
            {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Supports JPEG, PNG, BMP, etc.
          </Typography>
        </div>
        
        {image && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" gutterBottom>Preview:</Typography>
            <img 
              src={image} 
              alt="Uploaded preview" 
              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} 
            />
          </Box>
        )}
      </Paper>

      {error && (
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 4, alignItems: 'center' }}>
        <Button 
          variant="contained" 
          onClick={extractText} 
          disabled={!image || loading}
          startIcon={loading && !extractedText ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ flex: { xs: 1, md: 'none' } }}
        >
          Extract Text
        </Button>
        
        <FormControl sx={{ minWidth: 120, flex: { xs: 1, md: 'none' } }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            label="Language"
          >
            {languages.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 140, flex: { xs: 1, md: 'none' } }}>
          <InputLabel>API Provider</InputLabel>
          <Select
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value)}
            label="API Provider"
          >
            {apiProviders.map((provider) => (
              <MenuItem 
                key={provider.id} 
                value={provider.id}
                disabled={!apiStatus[provider.id]}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {provider.name}
                  {provider.free && (
                    <Tooltip title="Free service (may have limits)">
                      <Info sx={{ fontSize: 16, ml: 1, color: 'text.secondary' }} />
                    </Tooltip>
                  )}
                  {!apiStatus[provider.id] && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      (Unavailable)
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={translateText} 
          disabled={!extractedText || loading}
          startIcon={loading && extractedText ? <CircularProgress size={20} color="inherit" /> : null}
          endIcon={<SwapHoriz />}
          sx={{ flex: { xs: 1, md: 'none' } }}
        >
          Translate
        </Button>
      </Box>

      {(extractedText || translatedText) && (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {extractedText && (
            <Paper elevation={2} sx={{ p: 3, flex: 1, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">Extracted Text</Typography>
                <Button size="small" onClick={() => handleCopy(extractedText)}>Copy</Button>
              </Box>
              <TextField
                multiline
                fullWidth
                rows={8}
                variant="outlined"
                value={extractedText}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: '#f9f9f9' }}
              />
            </Paper>
          )}
          
          {translatedText && (
            <Paper elevation={2} sx={{ p: 3, flex: 1, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">Translated Text</Typography>
                <Button size="small" onClick={() => handleCopy(translatedText)}>Copy</Button>
              </Box>
              <TextField
                multiline
                fullWidth
                rows={8}
                variant="outlined"
                value={translatedText}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: '#f9f9f9' }}
              />
            </Paper>
          )}
        </Box>
      )}
    </Container>
  );
}

export default App;