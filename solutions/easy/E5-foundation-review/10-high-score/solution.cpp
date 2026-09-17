#include <algorithm>
#include <iostream>
int main() { int first, second, third; std::cin >> first >> second >> third; std::cout << std::max({first, second, third}) << "\n"; if (third > first && third > second) std::cout << "New high score!\n"; }
