import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {EmailComposerModal} from '../../../shared/components/ui/EmailComposerModal';
import type {EmailDocumentType} from '../../../services/api/endpoints/email.api';

// Optional native dependency — resolved after `yarn install` + rebuild. If it
// isn't present we fall back to opening the PDF in the device viewer.
let WebViewComp: any = null;
try {
  // @ts-ignore optional module
  WebViewComp = require('react-native-webview').WebView;
} catch {
  WebViewComp = null;
}

interface PdfViewerParams {
  url: string;
  title?: string;
  documentId?: string;
  documentType?: EmailDocumentType;
  fileName?: string;
}

export function PdfViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const {url, title, documentId, documentType, fileName} = (route.params || {}) as PdfViewerParams;

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // WKWebView renders PDFs inline on iOS; Android WebView cannot render remote
  // PDFs, so use the device viewer there.
  const canInlineRender = !!WebViewComp && Platform.OS === 'ios' && !failed;

  const openExternally = () => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || fileName || 'Document'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={openExternally}>
            <Ionicons name="download-outline" size={20} color="#16a34a" />
          </TouchableOpacity>
          {documentId ? (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowEmail(true)}>
              <Ionicons name="mail-outline" size={20} color="#7c3aed" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        {canInlineRender ? (
          <>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
            <WebViewComp
              source={{uri: url}}
              style={styles.webview}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              startInLoadingState={false}
            />
          </>
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="document-text-outline" size={56} color="#9ca3af" />
            <Text style={styles.fallbackTitle}>Preview not available here</Text>
            <Text style={styles.fallbackText}>
              Open the PDF in your device's viewer to read, print, or share it.
            </Text>
            <TouchableOpacity style={styles.openBtn} onPress={openExternally}>
              <Ionicons name="open-outline" size={18} color="#fff" />
              <Text style={styles.openBtnText}>Open PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {documentId ? (
        <EmailComposerModal
          visible={showEmail}
          documentId={documentId}
          documentType={documentType}
          fileName={fileName}
          onClose={() => setShowEmail(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#111827'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
  },
  iconBtn: {padding: Spacing.sm},
  headerTitle: {flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  headerActions: {flexDirection: 'row', alignItems: 'center'},
  body: {flex: 1, backgroundColor: '#111827'},
  webview: {flex: 1, backgroundColor: '#111827'},
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: '#111827',
  },
  fallback: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md, backgroundColor: '#f9fafb'},
  fallbackTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  fallbackText: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20},
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  openBtnText: {color: '#fff', fontWeight: '700', fontSize: FontSize.md},
});

export default PdfViewerScreen;
