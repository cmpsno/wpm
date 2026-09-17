#include <iostream>
int main() {
    int current, maximum; std::cin >> current >> maximum;
    if (current < 0) current = 0;
    if (current > maximum) current = maximum;
    int filled = current * 10 / maximum;
    std::cout << "["; for (int i = 0; i < 10; ++i) std::cout << (i < filled ? '#' : '-');
    std::cout << "] " << current * 100 / maximum << "%\n";
}
