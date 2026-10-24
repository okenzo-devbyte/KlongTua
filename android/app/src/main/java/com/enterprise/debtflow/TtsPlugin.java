package com.enterprise.debtflow;

import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "ThaiTts")
public class TtsPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;

    private PluginCall pendingCall;
    private String pendingText;
    private float pendingRate = 1.0f;
    private float pendingPitch = 1.0f;
    private float pendingVolume = 1.0f;
    private String pendingChime = "NONE";
    private String currentUtteranceId;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status != TextToSpeech.SUCCESS) {
                ready = false;
                resolvePending(false);
                return;
            }

            int languageResult = tts.setLanguage(new Locale("th", "TH"));
            ready = languageResult != TextToSpeech.LANG_MISSING_DATA
                && languageResult != TextToSpeech.LANG_NOT_SUPPORTED;

            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                }

                @Override
                public void onDone(String utteranceId) {
                    if (utteranceId.equals(currentUtteranceId)) {
                        resolvePending(true);
                    }
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    if (utteranceId.equals(currentUtteranceId)) {
                        resolvePending(false);
                    }
                }

                @Override
                public void onError(String utteranceId) {
                    if (utteranceId.equals(currentUtteranceId)) {
                        resolvePending(false);
                    }
                }
            });

            if (ready && pendingText != null) {
                String text = pendingText;
                PluginCall call = pendingCall;
                pendingText = null;
                startSpeak(call, text, pendingRate, pendingPitch, pendingVolume, pendingChime);
            } else if (!ready) {
                resolvePending(false);
            }
        });
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject response = new JSObject();
        response.put("available", ready);
        call.resolve(response);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text.trim().isEmpty()) {
            respondSpoken(call, false);
            return;
        }

        float rate = clamp(call.getFloat("rate", 1.0f), 0.5f, 1.5f);
        float pitch = clamp(call.getFloat("pitch", 1.0f), 0.5f, 2.0f);
        float volume = clamp(call.getFloat("volume", 1.0f), 0.1f, 1.0f);
        String chime = call.getString("chime", "NONE");

        if (!ready) {
            if (pendingCall != null) {
                resolvePending(false);
            }
            pendingCall = call;
            pendingText = text;
            pendingRate = rate;
            pendingPitch = pitch;
            pendingVolume = volume;
            pendingChime = chime;
            return;
        }

        startSpeak(call, text, rate, pitch, volume, chime);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            tts.stop();
        }
        currentUtteranceId = null;
        resolvePending(false);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        currentUtteranceId = null;
        ready = false;
        resolvePending(false);
    }

    private void startSpeak(
        PluginCall call,
        String text,
        float rate,
        float pitch,
        float volume,
        String chime
    ) {
        if (call == null) return;

        if (pendingCall != null && pendingCall != call) {
            resolvePending(false);
        }

        pendingCall = call;
        pendingText = null;
        playChime(chime, volume);

        String utteranceId = UUID.randomUUID().toString();
        currentUtteranceId = utteranceId;
        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
        if (result == TextToSpeech.ERROR) {
            resolvePending(false);
        }
    }

    private void resolvePending(boolean spoken) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call != null) {
            respondSpoken(call, spoken);
        }
    }

    private void respondSpoken(PluginCall call, boolean spoken) {
        JSObject response = new JSObject();
        response.put("spoken", spoken);
        call.resolve(response);
    }

    private void playChime(String chime, float volume) {
        if (chime == null || "NONE".equals(chime)) return;

        int tone;
        switch (chime) {
            case "URGENT":
                tone = ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD;
                break;
            case "GENTLE":
                tone = ToneGenerator.TONE_PROP_PROMPT;
                break;
            case "SUCCESS":
                tone = ToneGenerator.TONE_PROP_ACK;
                break;
            case "ENTERPRISE":
            default:
                tone = ToneGenerator.TONE_PROP_BEEP;
                break;
        }

        try {
            ToneGenerator generator = new ToneGenerator(
                AudioManager.STREAM_MUSIC,
                (int) (clamp(volume, 0.1f, 1.0f) * 100)
            );
            generator.startTone(tone, 160);
            new Handler(Looper.getMainLooper()).postDelayed(generator::release, 400);
        } catch (RuntimeException ignored) {
        }
    }

    private float clamp(float value, float min, float max) {
        return Math.min(max, Math.max(min, value));
    }
}
