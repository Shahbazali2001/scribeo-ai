import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore } from '@/hooks/use-app-store';
import { useAppTheme } from '@/hooks/use-app-theme';
import { triggerHaptic } from '@/lib/device';
import { appStore } from '@/store/app-store';

type FilterMode = 'all' | 'summarized' | 'low_confidence';

export default function HistoryScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const scans = useAppStore((s) => s.scans);

  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [scanToDelete, setScanToDelete] = useState<string | null>(null);

  const filteredScans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scans.filter((scan) => {
      if (filterMode === 'summarized' && Object.keys(scan.summaries).length === 0) {
        return false;
      }
      if (filterMode === 'low_confidence' && (scan.confidence ?? 1) >= 0.75) {
        return false;
      }
      if (!q) return true;
      const inText = scan.text?.toLowerCase().includes(q) ?? false;
      const inSummary = Object.values(scan.summaries).some((s) =>
        s?.text.toLowerCase().includes(q)
      );
      return inText || inSummary;
    });
  }, [scans, query, filterMode]);

  const confirmDelete = async () => {
    if (!scanToDelete) return;
    await triggerHaptic('warning');
    appStore.deleteScan(scanToDelete);
    setScanToDelete(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[styles.title, { color: palette.text }]}>Scan Library</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              Searchable English handwriting scans & AI summaries
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/scan' as never)}
            style={[styles.newScanBtn, { backgroundColor: palette.primary }]}>
            <Text style={styles.newScanBtnText}>+ Scan</Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search handwritten text or summaries..."
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.text }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: palette.textMuted }]}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(
            [
              { id: 'all', label: `All (${scans.length})` },
              { id: 'summarized', label: '✨ Summarized' },
              { id: 'low_confidence', label: '⚠️ Needs Review' },
            ] as const
          ).map((chip) => {
            const active = filterMode === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setFilterMode(chip.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : palette.textSecondary },
                  ]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredScans.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={{ fontSize: 32 }}>🗂️</Text>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              No matching scans found
            </Text>
            <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
              {query
                ? `No scans or summaries matched "${query}".`
                : 'Your saved handwriting scans will appear here.'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredScans.map((scan) => {
              const summaryList = Object.values(scan.summaries).filter(Boolean);
              const isLowConf = (scan.confidence ?? 1) < 0.75;
              const dateLabel = new Date(scan.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Pressable
                  key={scan.id}
                  onPress={() => router.push(`/scan/${scan.id}` as never)}
                  style={[
                    styles.scanCard,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}>
                  <View style={styles.scanRow}>
                    <Image
                      source={{ uri: scan.imageUrl }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                    <View style={styles.scanInfo}>
                      <View style={styles.scanTopRow}>
                        <Text style={[styles.dateText, { color: palette.textMuted }]}>
                          {dateLabel}
                        </Text>
                        <Pressable
                          onPress={() => setScanToDelete(scan.id)}
                          hitSlop={10}
                          style={[styles.deleteBadge, { backgroundColor: palette.dangerSoft }]}>
                          <Text style={[styles.deleteBadgeText, { color: palette.danger }]}>
                            Delete
                          </Text>
                        </Pressable>
                      </View>

                      <Text
                        numberOfLines={2}
                        style={[styles.scanPreview, { color: palette.text }]}>
                        {scan.text}
                      </Text>

                      <View style={styles.metaRow}>
                        <View
                          style={[
                            styles.metaPill,
                            { backgroundColor: palette.surfaceMuted },
                          ]}>
                          <Text
                            style={[
                              styles.metaPillText,
                              { color: palette.textSecondary },
                            ]}>
                            {scan.wordCount} words • v{scan.textVersion}
                          </Text>
                        </View>
                        {scan.confidence != null ? (
                          <View
                            style={[
                              styles.metaPill,
                              {
                                backgroundColor: isLowConf
                                  ? palette.amberSoft
                                  : palette.primarySoft,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.metaPillText,
                                {
                                  color: isLowConf ? palette.amber : palette.primary,
                                },
                              ]}>
                              {Math.round(scan.confidence * 100)}% conf
                            </Text>
                          </View>
                        ) : null}
                        {summaryList.length > 0 ? (
                          <View
                            style={[
                              styles.metaPill,
                              { backgroundColor: palette.accentSoft },
                            ]}>
                            <Text
                              style={[styles.metaPillText, { color: palette.accent }]}>
                              ✨ {summaryList.length} summary
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={scanToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setScanToDelete(null)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Delete Scan?
            </Text>
            <Text style={[styles.modalBody, { color: palette.textSecondary }]}>
              This will permanently delete the handwritten photo from private storage, along with its recognized text and all AI summaries.
            </Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setScanToDelete(null)}
                style={[
                  styles.modalSecondaryBtn,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[styles.modalSecondaryText, { color: palette.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                style={[styles.modalDangerBtn, { backgroundColor: palette.danger }]}>
                <Text style={styles.modalDangerText}>Delete Permanently</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  newScanBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  newScanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  emptyCard: {
    marginTop: 24,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBody: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  cardList: {
    gap: 12,
  },
  scanCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  scanInfo: {
    marginLeft: 14,
    flex: 1,
  },
  scanTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deleteBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scanPreview: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  modalBtnRow: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalDangerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  modalDangerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
