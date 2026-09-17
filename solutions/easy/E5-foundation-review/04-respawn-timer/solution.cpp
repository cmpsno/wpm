#include <iomanip>
#include <iostream>
int main() { int seconds; std::cin >> seconds; std::cout << std::setfill('0') << std::setw(2) << seconds / 60 << ":" << std::setw(2) << seconds % 60 << "\n"; }
