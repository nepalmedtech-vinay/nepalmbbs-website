import 'package:intl/intl.dart';

extension DateTimeExtensions on DateTime {
  String toFormattedDate() => DateFormat('dd MMM yyyy').format(this);
  String toFormattedTime() => DateFormat('hh:mm a').format(this);
  String toFormattedDateTime() => DateFormat('dd MMM yyyy, hh:mm a').format(this);

  bool isToday() {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  bool isYesterday() {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year &&
        month == yesterday.month &&
        day == yesterday.day;
  }

  String toRelativeTime() {
    final now = DateTime.now();
    final difference = now.difference(this);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else if (difference.inDays < 30) {
      return '${(difference.inDays / 7).floor()}w ago';
    } else if (difference.inDays < 365) {
      return '${(difference.inDays / 30).floor()}mo ago';
    } else {
      return '${(difference.inDays / 365).floor()}y ago';
    }
  }
}

extension StringExtensions on String {
  String capitalize() {
    if (isEmpty) return '';
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  bool isValidEmail() {
    final emailRegex =
        RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    return emailRegex.hasMatch(this);
  }

  bool isValidPhone() {
    final phoneRegex = RegExp(r'^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$');
    return phoneRegex.hasMatch(replaceAll(' ', ''));
  }

  String toPhoneDisplay() {
    // Convert +919876543210 to +91-9876543210 or (98) 7654-3210
    if (isEmpty) return '';
    if (startsWith('+')) {
      return this;
    }
    return '+91$this';
  }

  String truncate(int length, {String ellipsis = '...'}) {
    if (this.length <= length) return this;
    return '${substring(0, length)}$ellipsis';
  }
}

extension IntExtensions on int {
  String toScoreDisplay() => '$this/100';

  bool isHotScore() => this >= 75;
  bool isWarmScore() => this >= 50 && this < 75;
  bool isColdScore() => this < 50;

  String toScoreStatus() {
    if (isHotScore()) return 'Hot';
    if (isWarmScore()) return 'Warm';
    return 'Cold';
  }

  String toNeetPercentage() => '${((this / 720) * 100).toStringAsFixed(1)}%';
}

extension DoubleExtensions on double {
  String toPercentageString() => '${(this * 100).toStringAsFixed(1)}%';
  String toScoreDisplay() => toStringAsFixed(0);
}

extension MapExtensions<K, V> on Map<K, V> {
  Map<K, V> merge(Map<K, V> other) {
    return {...this, ...other};
  }
}

extension ListExtensions<T> on List<T> {
  List<T> sortByName(String Function(T) getName) {
    final list = [...this];
    list.sort((a, b) => getName(a).compareTo(getName(b)));
    return list;
  }

  List<T> filterByQuery(
    String query,
    String Function(T) getSearchText, {
    bool caseInsensitive = true,
  }) {
    if (query.isEmpty) return this;
    final searchQuery = caseInsensitive ? query.toLowerCase() : query;
    return where((item) {
      final text = caseInsensitive
          ? getSearchText(item).toLowerCase()
          : getSearchText(item);
      return text.contains(searchQuery);
    }).toList();
  }
}
