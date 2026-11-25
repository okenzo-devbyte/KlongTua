package com.enterprise.debtflow.widget;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Paint;
import android.util.TypedValue;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.enterprise.debtflow.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class DebtFlowWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new NoteWidgetViewsFactory(this.getApplicationContext());
    }

    private static class NoteWidgetViewsFactory implements RemoteViewsFactory {
        private final Context context;
        private final List<JSONObject> items = new ArrayList<>();
        private int textColor = Color.WHITE;
        private float textSizeSp = 13f;
        private String markerStyle = "BULLET";
        private boolean hideAmounts = false;
        private boolean privacyMode = false;

        NoteWidgetViewsFactory(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {
        }

        @Override
        public void onDataSetChanged() {
            items.clear();
            SharedPreferences prefs = context.getSharedPreferences(
                DebtFlowWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String snapshotJson = prefs.getString(DebtFlowWidgetProvider.KEY_SNAPSHOT, null);
            boolean filterUnpaidOnly = prefs.getBoolean(
                DebtFlowWidgetProvider.KEY_FILTER_UNPAID_ONLY,
                false
            );
            if (snapshotJson == null || snapshotJson.trim().isEmpty()) {
                return;
            }

            try {
                JSONObject snapshot = new JSONObject(snapshotJson);
                privacyMode = snapshot.optBoolean("privacyMode", false);

                JSONObject config = snapshot.optJSONObject("config");
                String paidDisplay = "STRIKETHROUGH_KEEP";
                boolean showPaidItems = true;
                if (config != null) {
                    textColor = parseColorSafe(config.optString("textColor", "#FFFFFF"), Color.WHITE);
                    String fontSize = config.optString("fontSize", "MD");
                    if ("SM".equals(fontSize)) {
                        textSizeSp = 11f;
                    } else if ("LG".equals(fontSize)) {
                        textSizeSp = 15f;
                    } else {
                        textSizeSp = 13f;
                    }
                    markerStyle = config.optString("markerStyle", "BULLET");
                    paidDisplay = config.optString("paidDisplay", "STRIKETHROUGH_KEEP");
                    showPaidItems = config.optBoolean("showPaidItems", true);
                    hideAmounts = config.optBoolean("hideAmounts", false);
                }

                JSONArray tasks = snapshot.optJSONArray("tasks");
                if (tasks == null) return;

                boolean hidePaid = filterUnpaidOnly || !showPaidItems || "HIDE".equals(paidDisplay);
                List<JSONObject> unpaid = new ArrayList<>();
                List<JSONObject> paid = new ArrayList<>();

                for (int i = 0; i < tasks.length(); i++) {
                    JSONObject task = tasks.optJSONObject(i);
                    if (task == null) continue;
                    boolean isPaid = task.optBoolean("isPaid", false);
                    if (hidePaid && isPaid) continue;

                    if ("STRIKETHROUGH_BOTTOM".equals(paidDisplay)) {
                        if (isPaid) {
                            paid.add(task);
                        } else {
                            unpaid.add(task);
                        }
                    } else {
                        items.add(task);
                    }
                }

                if ("STRIKETHROUGH_BOTTOM".equals(paidDisplay)) {
                    items.addAll(unpaid);
                    items.addAll(paid);
                }
            } catch (Exception ignored) {
            }
        }

        @Override
        public void onDestroy() {
            items.clear();
        }

        @Override
        public int getCount() {
            return items.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= items.size()) {
                return null;
            }

            JSONObject task = items.get(position);
            String taskId = task.optString("id", "");
            String loanTitle = task.optString("loanTitle", "รายการชำระ");
            boolean isPaid = task.optBoolean("isPaid", false);
            boolean isOverdue = task.optBoolean("isOverdue", false);
            double amount = task.optDouble("amount", 0);
            int dueDay = resolveDueDay(task);

            String prefix = "CHECKBOX".equals(markerStyle)
                ? (isPaid ? "☑ " : "☐ ")
                : "• ";

            StringBuilder line = new StringBuilder(prefix);
            if (privacyMode) {
                line.append("รายการที่ ").append(position + 1);
            } else {
                line.append(loanTitle);
            }
            if (dueDay > 0) {
                line.append(" ไม่เกินวันที่ ").append(dueDay);
            }
            if (!hideAmounts && !privacyMode) {
                line.append(" ").append(formatMoney(amount));
            }

            RemoteViews rowViews = new RemoteViews(context.getPackageName(), R.layout.widget_note_row);
            rowViews.setTextViewText(R.id.tv_note_line, line.toString());
            rowViews.setTextViewTextSize(R.id.tv_note_line, TypedValue.COMPLEX_UNIT_SP, textSizeSp);

            int resolvedColor = textColor;
            if (isPaid) {
                resolvedColor = applyAlpha(textColor, 0.52f);
            } else if (isOverdue) {
                boolean isLightText = Color.luminance(textColor) > 0.5f;
                resolvedColor = isLightText ? 0xFFFCA5A5 : 0xFFE11D48;
            }
            rowViews.setTextColor(R.id.tv_note_line, resolvedColor);

            int paintFlags = isPaid
                ? (Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG)
                : Paint.ANTI_ALIAS_FLAG;
            rowViews.setInt(R.id.tv_note_line, "setPaintFlags", paintFlags);

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(DebtFlowWidgetProvider.EXTRA_TASK_ID, taskId);
            rowViews.setOnClickFillInIntent(R.id.widget_note_row_root, fillInIntent);

            return rowViews;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            if (position < 0 || position >= items.size()) return position;
            String id = items.get(position).optString("id", String.valueOf(position));
            return id.hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        private static int resolveDueDay(JSONObject task) {
            int day = task.optInt("dueDayOfMonth", 0);
            if (day > 0) return day;
            String dateStr = task.optString("dueDateFormatted", "");
            String[] parts = dateStr.split("-");
            if (parts.length >= 3) {
                try {
                    return Integer.parseInt(parts[2].substring(0, Math.min(2, parts[2].length())).trim());
                } catch (Exception ignored) {
                }
            }
            return 0;
        }

        private static int parseColorSafe(String hex, int fallback) {
            if (hex == null || hex.trim().isEmpty()) return fallback;
            try {
                return Color.parseColor(hex.trim());
            } catch (Exception ignored) {
                return fallback;
            }
        }

        private static int applyAlpha(int color, float ratio) {
            int alpha = Math.round(Color.alpha(color) * ratio);
            return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
        }

        private static String formatMoney(double amount) {
            if (Double.isNaN(amount) || Double.isInfinite(amount)) return "0";
            return String.format(Locale.US, "%,.0f", Math.max(0, amount));
        }
    }
}
