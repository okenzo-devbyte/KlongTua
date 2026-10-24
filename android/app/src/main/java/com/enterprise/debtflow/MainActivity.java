package com.enterprise.debtflow;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(BiometricPlugin.class);
        registerPlugin(TtsPlugin.class);
        registerPlugin(PrintPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.getSettings().setSupportZoom(false);
        webView.getSettings().setBuiltInZoomControls(false);
        webView.getSettings().setDisplayZoomControls(false);
    }
}
