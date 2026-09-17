#include <iostream>
int main() { int hour, offset; std::cin >> hour >> offset; std::cout << ((hour + offset) % 24 + 24) % 24 << "\n"; }
